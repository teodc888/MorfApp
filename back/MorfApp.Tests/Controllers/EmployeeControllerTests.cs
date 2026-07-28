using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class EmployeeControllerTests : TestBase
{
    private Mock<IEmailService> _mockEmail = null!;

    private EmployeeController CreateController()
    {
        _mockEmail = new Mock<IEmailService>();
        _mockEmail.Setup(e => e.SendSetupEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                  .Returns(Task.CompletedTask);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:FrontendUrl"] = "https://pre.morfapp.app",
            })
            .Build();

        var ctrl = new EmployeeController(Db, _mockEmail.Object, config);
        SetupTenantClaims(ctrl, TenantId);
        return ctrl;
    }

    private async Task<Employee> CreateEmployeeAsync(
        string tenantId,
        string name = "Empleado Test",
        string? email = null,
        int paymentDay = 1,
        string paymentFrequency = "monthly")
    {
        var employee = new Employee
        {
            TenantId = tenantId,
            Name = name,
            Email = email,
            RemunerationType = "fixed",
            BaseSalary = 100000m,
            PaymentFrequency = paymentFrequency,
            PaymentDay = paymentDay,
            IsActive = true,
        };
        Db.Employees.Add(employee);
        await Db.SaveChangesAsync();
        return employee;
    }

    // ── GetEmployees ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetEmployees_ReturnsOnlyEmployeesFromTenant()
    {
        await CreateEmployeeAsync(TenantId, "Propio");
        await CreateEmployeeAsync("otro-tenant", "Ajeno");

        var ctrl = CreateController();
        var result = await ctrl.GetEmployees();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<EmployeeDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal("Propio", list[0].Name);
    }

    [Fact]
    public async Task GetEmployees_IncludesPendingAdvancesTotal()
    {
        var employee = await CreateEmployeeAsync(TenantId);
        Db.EmployeeAdvances.Add(new EmployeeAdvance { TenantId = TenantId, EmployeeId = employee.Id, Amount = 1000m, IsApplied = false });
        Db.EmployeeAdvances.Add(new EmployeeAdvance { TenantId = TenantId, EmployeeId = employee.Id, Amount = 500m, IsApplied = false });
        Db.EmployeeAdvances.Add(new EmployeeAdvance { TenantId = TenantId, EmployeeId = employee.Id, Amount = 9999m, IsApplied = true }); // ya aplicado, no debe sumar
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.GetEmployees();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<EmployeeDto>>(ok.Value);
        Assert.Equal(1500m, list[0].PendingAdvances);
    }

    // ── CreateEmployee ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateEmployee_ValidData_ReturnsCreatedAndTrimsFields()
    {
        var ctrl = CreateController();
        var result = await ctrl.CreateEmployee(new CreateEmployeeRequest
        {
            Name = "  Juan Pérez  ",
            Email = "  JUAN@Test.com  ",
            RemunerationType = "fixed",
            PaymentFrequency = "monthly",
            PaymentDay = 5,
        });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<EmployeeDto>(created.Value);
        Assert.Equal("Juan Pérez", dto.Name);
        Assert.Equal("juan@test.com", dto.Email);
        Assert.True(dto.IsActive);
        Assert.False(dto.HasAdminLogin);
    }

    [Fact]
    public async Task CreateEmployee_PersistsWithTenantId()
    {
        var ctrl = CreateController();
        await ctrl.CreateEmployee(new CreateEmployeeRequest { Name = "Nuevo", RemunerationType = "fixed", PaymentFrequency = "monthly" });

        var saved = Db.Employees.Single(e => e.Name == "Nuevo");
        Assert.Equal(TenantId, saved.TenantId);
    }

    // ── UpdateEmployee ────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateEmployee_Exists_UpdatesFields()
    {
        var employee = await CreateEmployeeAsync(TenantId, "Original");

        var ctrl = CreateController();
        var result = await ctrl.UpdateEmployee(employee.Id, new UpdateEmployeeRequest
        {
            Name = "Actualizado",
            RemunerationType = "hourly",
            HourlyRate = 2500m,
            PaymentFrequency = "weekly",
        });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<EmployeeDto>(ok.Value);
        Assert.Equal("Actualizado", dto.Name);
        Assert.Equal("hourly", dto.RemunerationType);
        Assert.Equal(2500m, dto.HourlyRate);
    }

    [Fact]
    public async Task UpdateEmployee_BelongsToOtherTenant_ReturnsNotFound()
    {
        var employee = await CreateEmployeeAsync("otro-tenant");

        var ctrl = CreateController();
        var result = await ctrl.UpdateEmployee(employee.Id, new UpdateEmployeeRequest { Name = "Hack", RemunerationType = "fixed", PaymentFrequency = "monthly" });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateEmployee_NotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.UpdateEmployee("no-existe", new UpdateEmployeeRequest { Name = "X", RemunerationType = "fixed", PaymentFrequency = "monthly" });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ── DeleteEmployee ────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteEmployee_Exists_SoftDeletesAndReturnsNoContent()
    {
        var employee = await CreateEmployeeAsync(TenantId);

        var ctrl = CreateController();
        var result = await ctrl.DeleteEmployee(employee.Id);

        Assert.IsType<NoContentResult>(result);
        var deleted = await Db.Employees.FindAsync(employee.Id);
        Assert.False(deleted!.IsActive);
    }

    [Fact]
    public async Task DeleteEmployee_WithAdminLogin_RevokesAccess()
    {
        var employee = await CreateEmployeeAsync(TenantId, email: "empleado@test.com");
        var adminUser = new AdminUser { TenantId = TenantId, Email = "empleado@test.com", PasswordHash = "x", Role = "employee" };
        Db.AdminUsers.Add(adminUser);
        employee.AdminUserId = adminUser.Id;
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        await ctrl.DeleteEmployee(employee.Id);

        Assert.Null(await Db.AdminUsers.FindAsync(adminUser.Id));
        var updated = await Db.Employees.FindAsync(employee.Id);
        Assert.Null(updated!.AdminUserId);
    }

    [Fact]
    public async Task DeleteEmployee_NotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.DeleteEmployee("no-existe");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── ActivateLogin ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ActivateLogin_NoEmail_ReturnsBadRequest()
    {
        var employee = await CreateEmployeeAsync(TenantId, email: null);

        var ctrl = CreateController();
        var result = await ctrl.ActivateLogin(employee.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ActivateLogin_AlreadyHasLogin_ReturnsBadRequest()
    {
        var employee = await CreateEmployeeAsync(TenantId, email: "e@test.com");
        employee.AdminUserId = "algun-id";
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.ActivateLogin(employee.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ActivateLogin_EmailAlreadyInUseByAnotherAdminUser_ReturnsBadRequest()
    {
        var employee = await CreateEmployeeAsync(TenantId, email: "duplicado@test.com");
        Db.AdminUsers.Add(new AdminUser { TenantId = TenantId, Email = "duplicado@test.com", PasswordHash = "x" });
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.ActivateLogin(employee.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ActivateLogin_Valid_CreatesAdminUserAndSetupToken()
    {
        var employee = await CreateEmployeeAsync(TenantId, email: "nuevo@test.com");

        var ctrl = CreateController();
        var result = await ctrl.ActivateLogin(employee.Id);

        Assert.IsType<OkObjectResult>(result);
        var updated = await Db.Employees.FindAsync(employee.Id);
        Assert.NotNull(updated!.AdminUserId);

        var adminUser = await Db.AdminUsers.FindAsync(updated.AdminUserId);
        Assert.NotNull(adminUser);
        Assert.Equal("employee", adminUser!.Role);
        Assert.Equal(TenantId, adminUser.TenantId);

        Assert.True(Db.SetupTokens.Any(t => t.AdminUserId == adminUser.Id));
        _mockEmail.Verify(e => e.SendSetupEmailAsync("nuevo@test.com", employee.Name, "Panel admin", It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ActivateLogin_EmailServiceFails_StillActivatesAccess()
    {
        var employee = await CreateEmployeeAsync(TenantId, email: "nuevo@test.com");

        _mockEmail = new Mock<IEmailService>();
        _mockEmail.Setup(e => e.SendSetupEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                  .ThrowsAsync(new Exception("SMTP caído"));
        var config = new ConfigurationBuilder().Build();
        var ctrl = new EmployeeController(Db, _mockEmail.Object, config);
        SetupTenantClaims(ctrl, TenantId);

        var result = await ctrl.ActivateLogin(employee.Id);

        // El acceso se activa igual aunque falle el envío de email
        Assert.IsType<OkObjectResult>(result);
        var updated = await Db.Employees.FindAsync(employee.Id);
        Assert.NotNull(updated!.AdminUserId);
    }

    [Fact]
    public async Task ActivateLogin_NotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.ActivateLogin("no-existe");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── DeactivateLogin ───────────────────────────────────────────────────────────

    [Fact]
    public async Task DeactivateLogin_Valid_RemovesAdminUserAndClearsReference()
    {
        var employee = await CreateEmployeeAsync(TenantId, email: "e@test.com");
        var adminUser = new AdminUser { TenantId = TenantId, Email = "e@test.com", PasswordHash = "x", Role = "employee" };
        Db.AdminUsers.Add(adminUser);
        employee.AdminUserId = adminUser.Id;
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.DeactivateLogin(employee.Id);

        Assert.IsType<NoContentResult>(result);
        Assert.Null(await Db.AdminUsers.FindAsync(adminUser.Id));
        var updated = await Db.Employees.FindAsync(employee.Id);
        Assert.Null(updated!.AdminUserId);
    }

    [Fact]
    public async Task DeactivateLogin_NoLogin_ReturnsBadRequest()
    {
        var employee = await CreateEmployeeAsync(TenantId);

        var ctrl = CreateController();
        var result = await ctrl.DeactivateLogin(employee.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeactivateLogin_NotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.DeactivateLogin("no-existe");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── GetPayments / RegisterPayment ─────────────────────────────────────────────

    [Fact]
    public async Task GetPayments_EmployeeNotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.GetPayments("no-existe");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetPayments_ReturnsOrderedByMostRecentFirst()
    {
        var employee = await CreateEmployeeAsync(TenantId);
        Db.SalaryPayments.Add(new SalaryPayment { TenantId = TenantId, EmployeeId = employee.Id, BasePaid = 100m, PaidAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) });
        Db.SalaryPayments.Add(new SalaryPayment { TenantId = TenantId, EmployeeId = employee.Id, BasePaid = 200m, PaidAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc) });
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.GetPayments(employee.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SalaryPaymentDto>>(ok.Value);
        Assert.Equal(2, list.Count);
        Assert.Equal(200m, list[0].BasePaid); // más reciente primero
    }

    [Fact]
    public async Task RegisterPayment_DeductsPendingAdvancesAndMarksThemApplied()
    {
        var employee = await CreateEmployeeAsync(TenantId);
        var advance1 = new EmployeeAdvance { TenantId = TenantId, EmployeeId = employee.Id, Amount = 1000m, IsApplied = false };
        var advance2 = new EmployeeAdvance { TenantId = TenantId, EmployeeId = employee.Id, Amount = 500m, IsApplied = false };
        Db.EmployeeAdvances.Add(advance1);
        Db.EmployeeAdvances.Add(advance2);
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.RegisterPayment(employee.Id, new RegisterPaymentRequest
        {
            BasePaid = 100000m,
            HoursAmount = 0m,
            Bonus = 0m,
        });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<SalaryPaymentDto>(created.Value);
        Assert.Equal(1500m, dto.AdvancesDeducted);
        Assert.Equal(98500m, dto.TotalPaid); // 100000 - 1500

        Assert.True((await Db.EmployeeAdvances.FindAsync(advance1.Id))!.IsApplied);
        Assert.True((await Db.EmployeeAdvances.FindAsync(advance2.Id))!.IsApplied);
    }

    [Fact]
    public async Task RegisterPayment_EmployeeNotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.RegisterPayment("no-existe", new RegisterPaymentRequest { BasePaid = 100m });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task RegisterPayment_DoesNotDeductAdvancesFromOtherEmployees()
    {
        var employee = await CreateEmployeeAsync(TenantId, "Empleado A");
        var otherEmployee = await CreateEmployeeAsync(TenantId, "Empleado B");
        Db.EmployeeAdvances.Add(new EmployeeAdvance { TenantId = TenantId, EmployeeId = otherEmployee.Id, Amount = 1000m, IsApplied = false });
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.RegisterPayment(employee.Id, new RegisterPaymentRequest { BasePaid = 100000m });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<SalaryPaymentDto>(created.Value);
        Assert.Equal(0m, dto.AdvancesDeducted);
    }

    // ── GetAdvances / RegisterAdvance ─────────────────────────────────────────────

    [Fact]
    public async Task GetAdvances_EmployeeNotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.GetAdvances("no-existe");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task RegisterAdvance_Valid_CreatesUnappliedAdvance()
    {
        var employee = await CreateEmployeeAsync(TenantId);

        var ctrl = CreateController();
        var result = await ctrl.RegisterAdvance(employee.Id, new RegisterAdvanceRequest { Amount = 2000m, Reason = "Adelanto quincena" });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<EmployeeAdvanceDto>(created.Value);
        Assert.Equal(2000m, dto.Amount);
        Assert.False(dto.IsApplied);
    }

    [Fact]
    public async Task RegisterAdvance_EmployeeNotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.RegisterAdvance("no-existe", new RegisterAdvanceRequest { Amount = 100m });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ── GetPending ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPending_OnlyIncludesActiveEmployeesFromTenant()
    {
        await CreateEmployeeAsync(TenantId, "Activo");
        var inactive = await CreateEmployeeAsync(TenantId, "Inactivo");
        inactive.IsActive = false;
        await CreateEmployeeAsync("otro-tenant", "Ajeno");
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.GetPending();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<EmployeePendingDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal("Activo", list[0].EmployeeName);
    }

    [Fact]
    public async Task GetPending_IncludesPendingAdvancesTotal()
    {
        var employee = await CreateEmployeeAsync(TenantId);
        Db.EmployeeAdvances.Add(new EmployeeAdvance { TenantId = TenantId, EmployeeId = employee.Id, Amount = 300m, IsApplied = false });
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        var result = await ctrl.GetPending();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<EmployeePendingDto>>(ok.Value);
        Assert.Equal(300m, list[0].PendingAdvances);
    }
}
