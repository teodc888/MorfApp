using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Public;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.Text;
using System.Text.RegularExpressions;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
[EnableRateLimiting("public")]
public class PublicController(IAppDbContext db, IMercadoPagoService mercadoPago, IConfiguration config, ILogger<PublicController> logger) : ControllerBase
{
    // GET /api/public/plans — catálogo único de precios (ver PlanCatalog).
    [HttpGet("plans")]
    public ActionResult<List<PlanInfo>> GetPlans() => Ok(PlanCatalog.Plans);

    // Crea el tenant (Pending) + branding elegido, y arranca la suscripción en Mercado Pago
    // (1 mes gratis + tarjeta cargada desde el alta). El tenant queda operativo recién cuando
    // llega el webhook "authorized" — ver MercadoPagoWebhookController.
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register([FromBody] RegisterInterestRequest req)
    {
        if (!Enum.TryParse<TenantPlan>(req.Plan, out var plan))
            return BadRequest(new { message = "Plan inválido" });

        var preapprovalPlanId = config[$"MercadoPago:PreapprovalPlanIds:{plan}"];
        if (string.IsNullOrEmpty(preapprovalPlanId))
            return StatusCode(503, new { message = "El alta automática no está disponible en este momento. Contactanos por WhatsApp." });

        var slug = await GenerateUniqueSlug(req.RestaurantName);
        var now = DateTime.UtcNow;

        var tenant = new Tenant
        {
            Slug = slug,
            Name = req.RestaurantName,
            Plan = plan,
            Status = TenantStatus.Pending,
            OwnerName = $"{req.FirstName} {req.LastName}".Trim(),
            OwnerPhone = req.Phone,
            OwnerEmail = req.Email,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Tenants.Add(tenant);

        var branding = new TenantBranding
        {
            TenantId = tenant.Id,
            ColorPrimary = req.ColorPrimary ?? "#e8390e",
            ColorAccent = req.ColorAccent ?? "#25D366",
            EmojiIcon = req.EmojiIcon ?? "🍔",
            UpdatedAt = now,
        };
        db.TenantBrandings.Add(branding);

        MpPreapprovalResult subscription;
        try
        {
            subscription = await mercadoPago.CreateSubscriptionAsync(preapprovalPlanId, req.Email, tenant.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "No se pudo crear la suscripción en Mercado Pago para el tenant {TenantId}", tenant.Id);
            return StatusCode(502, new { message = "No pudimos conectar con Mercado Pago. Probá de nuevo en unos minutos." });
        }

        tenant.MpPreapprovalId = subscription.PreapprovalId;
        await db.SaveChangesAsync();

        return Ok(new RegisterResponse("Registro recibido", tenant.Id, subscription.CheckoutUrl));
    }

    // GET /api/public/tenants/{id}/summary — datos mínimos y no sensibles para personalizar
    // la pantalla de espera post-Mercado Pago (nombre, subdominio, emoji, color).
    [HttpGet("tenants/{id}/summary")]
    public async Task<ActionResult<TenantSummaryDto>> GetTenantSummary(string id)
    {
        var tenant = await db.Tenants
            .Include(t => t.Branding)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (tenant is null) return NotFound();

        return Ok(new TenantSummaryDto(
            tenant.Name,
            tenant.Slug,
            tenant.Branding?.EmojiIcon ?? "🍔",
            tenant.Branding?.ColorPrimary ?? "#e8390e"));
    }

    private async Task<string> GenerateUniqueSlug(string name)
    {
        var base_ = Slugify(name);
        if (!await db.Tenants.AnyAsync(t => t.Slug == base_))
            return base_;

        for (var i = 2; i <= 99; i++)
        {
            var candidate = $"{base_}-{i}";
            if (!await db.Tenants.AnyAsync(t => t.Slug == candidate))
                return candidate;
        }
        return $"{base_}-{Guid.NewGuid().ToString("N")[..6]}";
    }

    private static string Slugify(string input)
    {
        var normalized = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
            if (cat != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        var clean = sb.ToString().Normalize(NormalizationForm.FormC);
        clean = Regex.Replace(clean.ToLowerInvariant(), @"[^a-z0-9\s-]", "");
        clean = Regex.Replace(clean, @"[\s-]+", "-");
        return clean.Trim('-');
    }
}
