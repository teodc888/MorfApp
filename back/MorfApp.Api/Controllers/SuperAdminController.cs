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
