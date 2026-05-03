using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.SuperAdmin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.Security.Claims;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/superadmin")]
[Authorize]
public class SuperAdminController(IAppDbContext db, IEmailService emailService, IConfiguration config) : ControllerBase
{
    private bool IsSuperAdmin =>
        User.FindFirstValue("is_superadmin") == "true";

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
            SubscriptionEndsAt = req.SubscriptionEndsAt,
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
        tenant.SubscriptionEndsAt = req.SubscriptionEndsAt;
        tenant.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
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
        tenant.UpdatedAt = now;
        await db.SaveChangesAsync();

        var frontendUrl = config["App:FrontendUrl"] ?? "https://morfapp.app";
        var setupUrl = $"{frontendUrl}/setup?token={setupToken.Token}";

        try
        {
            await emailService.SendSetupEmailAsync(tenant.OwnerEmail, tenant.OwnerName, tenant.Name, setupUrl);
        }
        catch (Exception ex)
        {
            return Ok(new { message = "Negocio activado pero no se pudo enviar el email", setupUrl, error = ex.Message });
        }

        return Ok(new { message = "Negocio activado y email enviado" });
    }

    [HttpGet("settings")]
    public async Task<ActionResult<SuperAdminSettingsDto>> GetSettings()
    {
        if (!IsSuperAdmin) return Forbid();

        var settings = await db.SuperAdminSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            var newSettings = new SuperAdminSettings();
            db.SuperAdminSettings.Add(newSettings);
            await db.SaveChangesAsync();
            settings = newSettings;
        }

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

public record UpdateTenantStatusRequest(string Status);
