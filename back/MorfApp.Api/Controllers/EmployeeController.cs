using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Constants;
using MorfApp.Domain.Entities;
using System.Security.Claims;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/admin/employees")]
[Authorize(Policy = "OwnerOnly")]
[Authorize(Policy = "Plan:Negocio")]
public class EmployeeController(IAppDbContext db, IEmailService emailService, IConfiguration config) : ControllerBase
{
    private string TenantId => User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException();

    // GET /api/admin/employees
    [HttpGet]
    public async Task<ActionResult<List<EmployeeDto>>> GetEmployees()
    {
        var employees = await db.Employees
            .Where(e => e.TenantId == TenantId)
            .OrderBy(e => e.Name)
            .ToListAsync();

        var pendingAdvances = await db.EmployeeAdvances
            .Where(a => a.TenantId == TenantId && !a.IsApplied)
            .GroupBy(a => a.EmployeeId)
            .Select(g => new { EmployeeId = g.Key, Total = g.Sum(a => a.Amount) })
            .ToListAsync();

        var advanceMap = pendingAdvances.ToDictionary(x => x.EmployeeId, x => x.Total);

        var adminUserIds = employees.Where(e => e.AdminUserId != null).Select(e => e.AdminUserId!).ToList();
        var permissionsMap = await db.AdminUsers
            .Where(u => adminUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Permissions);

        return Ok(employees.Select(e => MapEmployee(
            e,
            advanceMap.GetValueOrDefault(e.Id),
            e.AdminUserId != null ? permissionsMap.GetValueOrDefault(e.AdminUserId) ?? [] : []
        )).ToList());
    }

    // POST /api/admin/employees
    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> CreateEmployee([FromBody] CreateEmployeeRequest req)
    {
        var now = DateTime.UtcNow;
        var employee = new Employee
        {
            TenantId = TenantId,
            Name = req.Name.Trim(),
            Phone = req.Phone?.Trim(),
            Email = req.Email?.Trim().ToLower(),
            Position = req.Position?.Trim(),
            RemunerationType = req.RemunerationType,
            BaseSalary = req.BaseSalary,
            HourlyRate = req.HourlyRate,
            PaymentFrequency = req.PaymentFrequency,
            PaymentDay = req.PaymentDay,
            HireDate = req.HireDate,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetEmployees), MapEmployee(employee, 0, []));
    }

    // PUT /api/admin/employees/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<EmployeeDto>> UpdateEmployee(string id, [FromBody] UpdateEmployeeRequest req)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == TenantId);
        if (employee is null) return NotFound();

        employee.Name = req.Name.Trim();
        employee.Phone = req.Phone?.Trim();
        employee.Email = req.Email?.Trim().ToLower();
        employee.Position = req.Position?.Trim();
        employee.RemunerationType = req.RemunerationType;
        employee.BaseSalary = req.BaseSalary;
        employee.HourlyRate = req.HourlyRate;
        employee.PaymentFrequency = req.PaymentFrequency;
        employee.PaymentDay = req.PaymentDay;
        employee.HireDate = req.HireDate;
        employee.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var permissions = employee.AdminUserId is not null
            ? await db.AdminUsers.Where(u => u.Id == employee.AdminUserId).Select(u => u.Permissions).FirstOrDefaultAsync() ?? []
            : [];
        return Ok(MapEmployee(employee, 0, permissions));
    }

    // DELETE /api/admin/employees/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(string id)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == TenantId);
        if (employee is null) return NotFound();

        // Revocar acceso al panel si lo tenía
        if (employee.AdminUserId is not null)
        {
            var adminUser = await db.AdminUsers.FindAsync(employee.AdminUserId);
            if (adminUser is not null)
                db.AdminUsers.Remove(adminUser);
            employee.AdminUserId = null;
        }

        employee.IsActive = false;
        employee.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/admin/employees/{id}/activate-login
    [HttpPost("{id}/activate-login")]
    public async Task<IActionResult> ActivateLogin(string id)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == TenantId);
        if (employee is null) return NotFound();
        if (string.IsNullOrEmpty(employee.Email))
            return BadRequest(new { message = "El empleado no tiene email configurado" });
        if (employee.AdminUserId is not null)
            return BadRequest(new { message = "El empleado ya tiene acceso al panel" });

        var emailInUse = await db.AdminUsers
            .AnyAsync(u => u.TenantId == TenantId && u.Email == employee.Email);
        if (emailInUse)
            return BadRequest(new { message = "Ya existe un usuario con ese email en este negocio" });

        var now = DateTime.UtcNow;
        var adminUser = new AdminUser
        {
            TenantId = TenantId,
            Email = employee.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            IsSuperadmin = false,
            Role = "employee",
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.AdminUsers.Add(adminUser);

        var setupToken = new SetupToken
        {
            AdminUserId = adminUser.Id,
            Token = Guid.NewGuid().ToString("N"),
            ExpiresAt = now.AddHours(48),
            IsUsed = false,
            CreatedAt = now,
        };
        db.SetupTokens.Add(setupToken);

        employee.AdminUserId = adminUser.Id;
        employee.UpdatedAt = now;
        await db.SaveChangesAsync();

        var frontendUrl = config["App:FrontendUrl"] ?? "https://morfapp.app";
        var setupUrl = $"{frontendUrl}/setup?token={setupToken.Token}";

        try
        {
            await emailService.SendSetupEmailAsync(employee.Email, employee.Name, "Panel admin", setupUrl);
            return Ok(new { message = "Acceso activado y email enviado", setupUrl });
        }
        catch (Exception ex)
        {
            return Ok(new { message = "Acceso activado pero no se pudo enviar el email", setupUrl, error = ex.Message });
        }
    }

    // DELETE /api/admin/employees/{id}/activate-login
    [HttpDelete("{id}/activate-login")]
    public async Task<IActionResult> DeactivateLogin(string id)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == TenantId);
        if (employee is null) return NotFound();
        if (employee.AdminUserId is null)
            return BadRequest(new { message = "El empleado no tiene acceso al panel" });

        var adminUser = await db.AdminUsers.FindAsync(employee.AdminUserId);
        if (adminUser is not null)
            db.AdminUsers.Remove(adminUser);

        employee.AdminUserId = null;
        employee.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/admin/employees/{id}/permissions
    // Otorga/revoca módulos del admin panel a un empleado con acceso ya activado.
    // El owner siempre tiene acceso total y no pasa por acá — ver AuthController.GenerateJwt.
    [HttpPut("{id}/permissions")]
    public async Task<IActionResult> UpdatePermissions(string id, [FromBody] UpdateEmployeePermissionsRequest req)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == TenantId);
        if (employee is null) return NotFound();
        if (employee.AdminUserId is null)
            return BadRequest(new { message = "Activá el acceso al panel antes de asignar permisos" });

        var invalid = req.Permissions.Except(PermissionKeys.All).ToList();
        if (invalid.Count > 0)
            return BadRequest(new { message = $"Permisos inválidos: {string.Join(", ", invalid)}" });

        var adminUser = await db.AdminUsers.FindAsync(employee.AdminUserId);
        if (adminUser is null) return NotFound();

        adminUser.Permissions = req.Permissions.Distinct().ToList();
        adminUser.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/admin/employees/{id}/payments
    [HttpGet("{id}/payments")]
    public async Task<ActionResult<List<SalaryPaymentDto>>> GetPayments(string id)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == TenantId);
        if (employee is null) return NotFound();

        var payments = await db.SalaryPayments
            .Where(p => p.TenantId == TenantId && p.EmployeeId == id)
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();

        return Ok(payments.Select(p => MapPayment(p, employee.Name)).ToList());
    }

    // POST /api/admin/employees/{id}/payments
    [HttpPost("{id}/payments")]
    public async Task<ActionResult<SalaryPaymentDto>> RegisterPayment(string id, [FromBody] RegisterPaymentRequest req)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == TenantId);
        if (employee is null) return NotFound();

        // Collect all pending advances and deduct them
        var pendingAdvances = await db.EmployeeAdvances
            .Where(a => a.TenantId == TenantId && a.EmployeeId == id && !a.IsApplied)
            .ToListAsync();

        var advancesDeducted = pendingAdvances.Sum(a => a.Amount);
        var total = req.BasePaid + req.HoursAmount + req.Bonus - advancesDeducted;

        var now = DateTime.UtcNow;
        var payment = new SalaryPayment
        {
            TenantId = TenantId,
            EmployeeId = id,
            PeriodStart = req.PeriodStart,
            PeriodEnd = req.PeriodEnd,
            BasePaid = req.BasePaid,
            HoursWorked = req.HoursWorked,
            HoursAmount = req.HoursAmount,
            AdvancesDeducted = advancesDeducted,
            Bonus = req.Bonus,
            TotalPaid = total,
            IsAguinaldo = req.IsAguinaldo,
            Notes = req.Notes,
            PaidAt = req.PaidAt,
            CreatedAt = now,
        };
        db.SalaryPayments.Add(payment);

        // Mark all pending advances as applied
        foreach (var advance in pendingAdvances)
        {
            advance.IsApplied = true;
            advance.SalaryPaymentId = payment.Id;
        }

        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPayments), new { id }, MapPayment(payment, employee.Name));
    }

    // GET /api/admin/employees/{id}/advances
    [HttpGet("{id}/advances")]
    public async Task<ActionResult<List<EmployeeAdvanceDto>>> GetAdvances(string id)
    {
        var exists = await db.Employees.AnyAsync(e => e.Id == id && e.TenantId == TenantId);
        if (!exists) return NotFound();

        var advances = await db.EmployeeAdvances
            .Where(a => a.TenantId == TenantId && a.EmployeeId == id)
            .OrderByDescending(a => a.Date)
            .ToListAsync();

        return Ok(advances.Select(MapAdvance).ToList());
    }

    // POST /api/admin/employees/{id}/advances
    [HttpPost("{id}/advances")]
    public async Task<ActionResult<EmployeeAdvanceDto>> RegisterAdvance(string id, [FromBody] RegisterAdvanceRequest req)
    {
        var exists = await db.Employees.AnyAsync(e => e.Id == id && e.TenantId == TenantId);
        if (!exists) return NotFound();

        var advance = new EmployeeAdvance
        {
            TenantId = TenantId,
            EmployeeId = id,
            Amount = req.Amount,
            Reason = req.Reason,
            Date = req.Date,
            IsApplied = false,
            CreatedAt = DateTime.UtcNow,
        };
        db.EmployeeAdvances.Add(advance);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAdvances), new { id }, MapAdvance(advance));
    }

    // GET /api/admin/employees/pending
    [HttpGet("pending")]
    public async Task<ActionResult<List<EmployeePendingDto>>> GetPending()
    {
        var employees = await db.Employees
            .Where(e => e.TenantId == TenantId && e.IsActive)
            .ToListAsync();

        var pendingAdvances = await db.EmployeeAdvances
            .Where(a => a.TenantId == TenantId && !a.IsApplied)
            .GroupBy(a => a.EmployeeId)
            .Select(g => new { EmployeeId = g.Key, Total = g.Sum(a => a.Amount) })
            .ToListAsync();

        var advanceMap = pendingAdvances.ToDictionary(x => x.EmployeeId, x => x.Total);

        var today = DateTime.UtcNow;
        var month = today.Month;
        bool isAguinaldoMonth = month == 6 || month == 12;

        var result = new List<EmployeePendingDto>();

        foreach (var emp in employees)
        {
            var nextPayment = CalculateNextPaymentDate(emp, today);
            var daysUntil = (int)(nextPayment.Date - today.Date).TotalDays;
            var pendingAmt = advanceMap.GetValueOrDefault(emp.Id);

            decimal aguinaldoEstimate = 0;
            if (isAguinaldoMonth)
                aguinaldoEstimate = await CalculateAguinaldo(emp.Id, today);

            result.Add(new EmployeePendingDto
            {
                EmployeeId = emp.Id,
                EmployeeName = emp.Name,
                Position = emp.Position,
                RemunerationType = emp.RemunerationType,
                BaseSalary = emp.BaseSalary,
                HourlyRate = emp.HourlyRate,
                PaymentFrequency = emp.PaymentFrequency,
                NextPaymentDate = nextPayment,
                DaysUntilPayment = daysUntil,
                PendingAdvances = pendingAmt,
                AguinaldoDue = isAguinaldoMonth,
                AguinaldoEstimate = aguinaldoEstimate,
            });
        }

        return Ok(result.OrderBy(r => r.DaysUntilPayment).ToList());
    }

    // ── Private helpers ──

    private static DateTime CalculateNextPaymentDate(Employee emp, DateTime from)
    {
        var day = emp.PaymentDay;
        return emp.PaymentFrequency switch
        {
            "weekly" => from.AddDays(7 - (int)from.DayOfWeek + day).Date,
            "biweekly" => from.Day < day
                ? new DateTime(from.Year, from.Month, day, 0, 0, 0, DateTimeKind.Utc)
                : new DateTime(from.Year, from.Month, Math.Min(day + 14, DateTime.DaysInMonth(from.Year, from.Month)), 0, 0, 0, DateTimeKind.Utc),
            _ => from.Day <= day
                ? new DateTime(from.Year, from.Month, day, 0, 0, 0, DateTimeKind.Utc)
                : new DateTime(from.Year == 12 ? from.Year + 1 : from.Year, from.Month == 12 ? 1 : from.Month + 1, day, 0, 0, 0, DateTimeKind.Utc),
        };
    }

    private async Task<decimal> CalculateAguinaldo(string employeeId, DateTime today)
    {
        // SAC = best monthly salary in the semester / 2
        var semesterStart = today.Month <= 6
            ? new DateTime(today.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            : new DateTime(today.Year, 7, 1, 0, 0, 0, DateTimeKind.Utc);

        var bestSalary = await db.SalaryPayments
            .Where(p => p.TenantId == TenantId && p.EmployeeId == employeeId
                        && !p.IsAguinaldo && p.PaidAt >= semesterStart && p.PaidAt <= today)
            .Select(p => p.BasePaid)
            .OrderByDescending(s => s)
            .FirstOrDefaultAsync();

        return bestSalary / 2;
    }

    private static EmployeeDto MapEmployee(Employee e, decimal pendingAdvances, List<string> permissions) => new()
    {
        Id = e.Id,
        Name = e.Name,
        Phone = e.Phone,
        Email = e.Email,
        Position = e.Position,
        RemunerationType = e.RemunerationType,
        BaseSalary = e.BaseSalary,
        HourlyRate = e.HourlyRate,
        PaymentFrequency = e.PaymentFrequency,
        PaymentDay = e.PaymentDay,
        HireDate = e.HireDate,
        IsActive = e.IsActive,
        HasAdminLogin = e.AdminUserId is not null,
        Permissions = permissions,
        PendingAdvances = pendingAdvances,
        CreatedAt = e.CreatedAt,
    };

    private static SalaryPaymentDto MapPayment(SalaryPayment p, string employeeName) => new()
    {
        Id = p.Id,
        EmployeeId = p.EmployeeId,
        EmployeeName = employeeName,
        PeriodStart = p.PeriodStart,
        PeriodEnd = p.PeriodEnd,
        BasePaid = p.BasePaid,
        HoursWorked = p.HoursWorked,
        HoursAmount = p.HoursAmount,
        AdvancesDeducted = p.AdvancesDeducted,
        Bonus = p.Bonus,
        TotalPaid = p.TotalPaid,
        IsAguinaldo = p.IsAguinaldo,
        Notes = p.Notes,
        PaidAt = p.PaidAt,
        CreatedAt = p.CreatedAt,
    };

    private static EmployeeAdvanceDto MapAdvance(EmployeeAdvance a) => new()
    {
        Id = a.Id,
        EmployeeId = a.EmployeeId,
        Amount = a.Amount,
        Reason = a.Reason,
        Date = a.Date,
        IsApplied = a.IsApplied,
        SalaryPaymentId = a.SalaryPaymentId,
        CreatedAt = a.CreatedAt,
    };
}
