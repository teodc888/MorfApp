using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MorfApp.Application.DTOs.SuperAdmin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/superadmin")]
[Authorize]
public class SuperAdminController(IAppDbContext db, IEmailService emailService, IConfiguration config, ILogger<SuperAdminController> logger) : ControllerBase
{
    private bool IsSuperAdmin =>
        User.FindFirstValue("is_superadmin") == "true";

    // Constantes de negocio del dashboard
    private const int ChurnWindowDays = 14;
    private const int UpcomingExpirationWindowDays = 7;

    [HttpGet("dashboard")]
    public async Task<ActionResult<SuperAdminDashboardDto>> GetDashboard()
    {
        if (!IsSuperAdmin) return Forbid();

        var now = DateTime.UtcNow;

        var tenants = await db.Tenants.ToListAsync();
        var activeCount    = tenants.Count(t => t.Status == TenantStatus.Active);
        var pendingCount   = tenants.Count(t => t.Status == TenantStatus.Pending);
        var expiredCount   = tenants.Count(t => t.Status == TenantStatus.Inactive);
        var suspendedCount = tenants.Count(t => t.Status == TenantStatus.Suspended);

        var cutoff7  = now.AddDays(-7);
        var cutoff30 = now.AddDays(-30);
        var cutoffChurn = now.AddDays(-ChurnWindowDays);

        var tenantNames = tenants.ToDictionary(t => t.Id, t => t.Name);

        var orders7 = await db.Orders
            .Where(o => o.CreatedAt >= cutoff7)
            .GroupBy(o => o.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToListAsync();

        var orders30 = await db.Orders
            .Where(o => o.CreatedAt >= cutoff30)
            .GroupBy(o => o.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToListAsync();

        var ordersLast7Days = orders7
            .Select(x => new TenantOrderCountDto(x.TenantId, tenantNames.GetValueOrDefault(x.TenantId, "?"), x.Count))
            .OrderByDescending(x => x.OrderCount)
            .ToList();

        var ordersLast30Days = orders30
            .Select(x => new TenantOrderCountDto(x.TenantId, tenantNames.GetValueOrDefault(x.TenantId, "?"), x.Count))
            .OrderByDescending(x => x.OrderCount)
            .ToList();

        var lastOrderByTenant = await db.Orders
            .GroupBy(o => o.TenantId)
            .Select(g => new { TenantId = g.Key, LastOrderAt = g.Max(o => o.CreatedAt) })
            .ToDictionaryAsync(x => x.TenantId, x => x.LastOrderAt);

        var churnAlerts = tenants
            .Where(t => t.Status == TenantStatus.Active)
            .Where(t => !lastOrderByTenant.TryGetValue(t.Id, out var last) || last < cutoffChurn)
            .Select(t => new ChurnAlertDto(
                t.Id, t.Name,
                lastOrderByTenant.TryGetValue(t.Id, out var l) ? l : (DateTime?)null))
            .ToList();

        var upcomingExpirations = tenants
            .Where(t => t.Status == TenantStatus.Active
                     && t.SubscriptionEndsAt.HasValue
                     && t.SubscriptionEndsAt.Value >= now
                     && t.SubscriptionEndsAt.Value <= now.AddDays(UpcomingExpirationWindowDays))
            .Select(t => new UpcomingExpirationDto(
                t.Id, t.Name, t.SubscriptionEndsAt!.Value,
                (int)Math.Ceiling((t.SubscriptionEndsAt.Value - now).TotalDays)))
            .OrderBy(x => x.DaysRemaining)
            .ToList();

        return Ok(new SuperAdminDashboardDto(
            activeCount, pendingCount, expiredCount, suspendedCount,
            ordersLast7Days, ordersLast30Days, churnAlerts, upcomingExpirations
        ));
    }

    [HttpGet("tenants")]
    public async Task<ActionResult<List<SuperAdminTenantDto>>> GetTenants()
    {
        if (!IsSuperAdmin) return Forbid();

        var tenants = await db.Tenants
            .Include(t => t.AdminUsers)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(tenants.Select(MapToDto).ToList());
    }

    [HttpPost("tenants")]
    public async Task<ActionResult<SuperAdminTenantDto>> CreateTenant([FromBody] CreateTenantRequest req)
    {
        if (!IsSuperAdmin) return Forbid();

        if (await db.Tenants.AnyAsync(t => t.Slug == req.Slug))
            return BadRequest(new { message = "El slug ya está en uso" });

        if (await db.AdminUsers.AnyAsync(u => u.Email == req.AdminEmail))
            return BadRequest(new { message = "El email ya está registrado" });

        if (!Enum.TryParse<TenantPlan>(req.Plan, out var plan))
            return BadRequest(new { message = "Plan inválido" });

        var now = DateTime.UtcNow;
        var tenant = new Tenant
        {
            Slug = req.Slug.ToLower().Trim(),
            Name = req.Name,
            Plan = plan,
            OwnerName = req.OwnerName,
            OwnerPhone = req.OwnerPhone,
            SubscriptionEndsAt = req.SubscriptionEndsAt.HasValue
                ? DateTime.SpecifyKind(req.SubscriptionEndsAt.Value, DateTimeKind.Utc)
                : null,
            Status = TenantStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Tenants.Add(tenant);

        var adminUser = new AdminUser
        {
            TenantId = tenant.Id,
            Email = req.AdminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.AdminPassword),
            IsSuperadmin = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.AdminUsers.Add(adminUser);

        await db.SaveChangesAsync();

        tenant.AdminUsers = [adminUser];
        return CreatedAtAction(nameof(GetTenants), MapToDto(tenant));
    }

    [HttpPut("tenants/{id}")]
    public async Task<IActionResult> UpdateTenant(string id, [FromBody] UpdateTenantSuperAdminRequest req)
    {
        if (!IsSuperAdmin) return Forbid();

        var tenant = await db.Tenants.FindAsync(id);
        if (tenant is null) return NotFound();

        if (req.Name is not null) tenant.Name = req.Name;
        if (req.OwnerName is not null) tenant.OwnerName = req.OwnerName;
        if (req.OwnerPhone is not null) tenant.OwnerPhone = req.OwnerPhone;
        if (req.SubscriptionEndsAt.HasValue)
            tenant.SubscriptionEndsAt = DateTime.SpecifyKind(req.SubscriptionEndsAt.Value, DateTimeKind.Utc);
        if (req.Plan is not null)
        {
            if (!Enum.TryParse<TenantPlan>(req.Plan, out var plan))
                return BadRequest(new { message = "Plan inválido" });
            tenant.Plan = plan;
        }
        if (req.Slug is not null)
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(req.Slug, @"^[a-z0-9-]+$"))
                return BadRequest(new { message = "El slug solo puede contener minúsculas, números y guiones" });

            bool slugTaken = await db.Tenants.AnyAsync(t => t.Slug == req.Slug && t.Id != id);
            if (slugTaken)
                return BadRequest(new { message = "Ese slug ya está en uso por otro comercio" });

            tenant.Slug = req.Slug;
        }
        tenant.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("tenants/{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id)
    {
        if (!IsSuperAdmin) return Forbid();

        var tenant = await db.Tenants.FindAsync(id);
        if (tenant is null) return NotFound(new { message = "Tenant no encontrado" });

        var user = await db.AdminUsers
            .FirstOrDefaultAsync(u => u.TenantId == id && !u.IsSuperadmin);
        if (user is null)
            return NotFound(new { message = "No hay usuario admin para este tenant" });

        // Invalidar tokens anteriores
        var oldTokens = db.SetupTokens.Where(s => s.AdminUserId == user.Id && !s.IsUsed);
        await oldTokens.ForEachAsync(s => s.IsUsed = true);

        // Crear nuevo token
        var token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        db.SetupTokens.Add(new MorfApp.Domain.Entities.SetupToken
        {
            AdminUserId = user.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(72),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        return Ok(new { setupUrl = $"/activate?token={token}" });
    }

    [HttpPut("tenants/{id}/status")]
    public async Task<IActionResult> UpdateTenantStatus(string id, [FromBody] UpdateTenantStatusRequest req)
    {
        if (!IsSuperAdmin) return Forbid();

        var tenant = await db.Tenants.FindAsync(id);
        if (tenant is null) return NotFound();

        if (!Enum.TryParse<TenantStatus>(req.Status, out var status))
            return BadRequest(new { message = "Estado inválido" });

        tenant.Status = status;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("tenants/{id}/activate")]
    public async Task<IActionResult> ActivateTenant(string id)
    {
        if (!IsSuperAdmin) return Forbid();

        var tenant = await db.Tenants.Include(t => t.AdminUsers).FirstOrDefaultAsync(t => t.Id == id);
        if (tenant is null) return NotFound();
        if (tenant.Status != TenantStatus.Pending) return BadRequest(new { message = "El negocio no está en estado pendiente" });
        if (string.IsNullOrEmpty(tenant.OwnerEmail)) return BadRequest(new { message = "El negocio no tiene email del dueño" });

        var now = DateTime.UtcNow;

        var existingUser = tenant.AdminUsers.FirstOrDefault(u => u.Email == tenant.OwnerEmail);
        if (existingUser is not null)
            return BadRequest(new { message = "Ya existe un usuario admin con ese email para este negocio" });

        var adminUser = new AdminUser
        {
            TenantId = tenant.Id,
            Email = tenant.OwnerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            IsSuperadmin = false,
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

        tenant.Status = TenantStatus.Active;
        tenant.SubscriptionEndsAt = now.AddDays(30);
        tenant.UpdatedAt = now;
        await db.SaveChangesAsync();

        var frontendUrl = config["App:FrontendUrl"] ?? "https://morfapp.app";
        var setupUrl = $"{frontendUrl}/setup?token={setupToken.Token}";

        try
        {
            await emailService.SendSetupEmailAsync(tenant.OwnerEmail, tenant.OwnerName, tenant.Name, setupUrl);
            return Ok(new { message = "Negocio activado y email enviado", setupUrl });
        }
        catch (Exception ex)
        {
            return Ok(new { message = "Negocio activado pero no se pudo enviar el email", setupUrl, error = ex.Message });
        }
    }

    [HttpPost("tenants/{id}/impersonate")]
    public async Task<ActionResult<ImpersonateResponse>> ImpersonateTenant(string id)
    {
        if (!IsSuperAdmin) return Forbid();

        var tenant = await db.Tenants.FindAsync(id);
        if (tenant is null) return NotFound();

        var superAdminId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var superAdminEmail = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);

        var expiryMinutes = config.GetValue<int>("Jwt:ExpiryMinutes", 15);
        var secret = config["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, superAdminId ?? string.Empty),
            new(JwtRegisteredClaimNames.Email, superAdminEmail ?? string.Empty),
            new("is_superadmin", "false"),
            new("tenant_id", tenant.Id),
            new("tenant_slug", tenant.Slug),
            new("tenant_plan", tenant.Plan.ToString()),
            new("impersonated", "true"),
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

        logger.LogWarning("Superadmin {SuperAdminId} impersonó al tenant {TenantId} ({TenantSlug})", superAdminId, tenant.Id, tenant.Slug);

        return Ok(new ImpersonateResponse(accessToken, expiryMinutes * 60));
    }

    [HttpGet("settings")]
    public async Task<ActionResult<SuperAdminSettingsDto>> GetSettings()
    {
        if (!IsSuperAdmin) return Forbid();

        var settings = await db.SuperAdminSettings.FirstOrDefaultAsync();
        if (settings is null)
            return Ok(MapSettingsToDto(new SuperAdminSettings()));

        return Ok(MapSettingsToDto(settings));
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSuperAdminSettingsRequest req)
    {
        if (!IsSuperAdmin) return Forbid();

        var settings = await db.SuperAdminSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new SuperAdminSettings();
            db.SuperAdminSettings.Add(settings);
        }

        settings.NotificationMessageTemplate = req.NotificationMessageTemplate;
        settings.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("errors")]
    public async Task<ActionResult<ErrorLogListDto>> GetErrors(
        [FromQuery] bool? resolved,
        [FromQuery] string? tenantId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (!IsSuperAdmin) return Forbid();

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = db.ErrorLogs.AsQueryable();
        if (resolved.HasValue) query = query.Where(e => e.IsResolved == resolved.Value);
        if (!string.IsNullOrEmpty(tenantId)) query = query.Where(e => e.TenantId == tenantId);

        var total = await query.CountAsync();
        var unresolvedCount = await db.ErrorLogs.CountAsync(e => !e.IsResolved);

        var errors = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var tenantIds = errors.Where(e => e.TenantId != null).Select(e => e.TenantId!).Distinct().ToList();
        var tenantNames = await db.Tenants
            .Where(t => tenantIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name);

        var items = errors
            .Select(e => new ErrorLogDto(
                e.Id,
                e.TenantId,
                e.TenantId != null ? tenantNames.GetValueOrDefault(e.TenantId) : null,
                e.Path,
                e.Method,
                e.ExceptionType,
                e.Message,
                e.StackTrace,
                e.IsResolved,
                e.CreatedAt))
            .ToList();

        return Ok(new ErrorLogListDto(items, total, unresolvedCount));
    }

    [HttpPut("errors/{id}")]
    public async Task<IActionResult> UpdateErrorLog(string id, [FromBody] UpdateErrorLogRequest req)
    {
        if (!IsSuperAdmin) return Forbid();

        var error = await db.ErrorLogs.FindAsync(id);
        if (error is null) return NotFound();

        error.IsResolved = req.IsResolved;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static SuperAdminTenantDto MapToDto(Tenant t) => new(
        t.Id,
        t.Slug,
        t.Name,
        t.OwnerName,
        t.OwnerPhone,
        t.OwnerEmail,
        t.Plan.ToString(),
        t.Status.ToString(),
        t.SubscriptionEndsAt,
        t.CreatedAt,
        t.AdminUsers?.Count ?? 0
    );

    private static SuperAdminSettingsDto MapSettingsToDto(SuperAdminSettings s) => new()
    {
        Id = s.Id,
        NotificationMessageTemplate = s.NotificationMessageTemplate,
        UpdatedAt = s.UpdatedAt,
    };
}
