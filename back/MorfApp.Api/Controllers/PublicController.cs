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
public class PublicController(IAppDbContext db) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterInterestRequest req)
    {
        if (!Enum.TryParse<TenantPlan>(req.Plan, out var plan))
            return BadRequest(new { message = "Plan inválido" });

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
        await db.SaveChangesAsync();

        return Ok(new { message = "Registro recibido", tenantId = tenant.Id });
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
