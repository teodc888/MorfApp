using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Store;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Enums;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/store")]
public class StoreController(IAppDbContext db) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<ActionResult<TenantPublicDto>> GetTenant(string slug)
    {
        var tenant = await db.Tenants
            .Include(t => t.Branding)
            .Include(t => t.DeliveryConfig)
            .Include(t => t.BusinessHours)
            .FirstOrDefaultAsync(t => t.Slug == slug);

        if (tenant is null || tenant.Status == TenantStatus.Suspended)
            return NotFound();

        var isOpen = IsCurrentlyOpen(tenant.BusinessHours);

        var dto = new TenantPublicDto(
            Id: tenant.Id,
            Slug: tenant.Slug,
            Name: tenant.Name,
            WhatsappNumber: tenant.WhatsappNumber,
            WhatsAppMessageTemplate: tenant.WhatsAppMessageTemplate,
            IsOpen: isOpen,
            Branding: new BrandingDto(
                ColorPrimary: tenant.Branding?.ColorPrimary ?? "#e8390e",
                ColorAccent: tenant.Branding?.ColorAccent ?? "#25D366",
                LogoUrl: tenant.Branding?.LogoUrl,
                BannerUrl: tenant.Branding?.BannerUrl,
                Tagline: tenant.Branding?.Tagline,
                EmojiIcon: tenant.Branding?.EmojiIcon ?? "🍔"
            ),
            DeliveryConfig: tenant.DeliveryConfig is null
                ? new DeliveryConfigDto("both", null, null, null, null, null)
                : new DeliveryConfigDto(
                    Mode: tenant.DeliveryConfig.Mode.ToString().ToLowerInvariant(),
                    DeliveryCost: tenant.DeliveryConfig.DeliveryCost,
                    FreeDeliveryFrom: tenant.DeliveryConfig.FreeDeliveryFrom,
                    MinOrderAmount: tenant.DeliveryConfig.MinOrderAmount,
                    EstimatedMinutes: tenant.DeliveryConfig.EstimatedMinutes,
                    PickupAddress: tenant.DeliveryConfig.PickupAddress
                ),
            BusinessHours: tenant.BusinessHours
                .OrderBy(h => h.DayOfWeek)
                .Select(h => new BusinessHourDto(h.DayOfWeek, h.IsOpen, h.OpensAt, h.ClosesAt))
                .ToList()
        );

        return Ok(dto);
    }

    [HttpGet("{slug}/menu")]
    public async Task<ActionResult<List<CategoryDto>>> GetMenu(string slug)
    {
        var tenantExists = await db.Tenants
            .AnyAsync(t => t.Slug == slug && t.Status != TenantStatus.Suspended);

        if (!tenantExists) return NotFound();

        var categories = await db.Categories
            .Where(c => c.Tenant.Slug == slug && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Include(c => c.Products.Where(p => p.IsActive).OrderBy(p => p.SortOrder))
                .ThenInclude(p => p.ModifierGroups.OrderBy(g => g.SortOrder))
                    .ThenInclude(g => g.Options.Where(o => o.IsActive).OrderBy(o => o.SortOrder))
            .ToListAsync();

        var result = categories.Select(c => new CategoryDto(
            c.Id, c.Name, c.Emoji, c.SortOrder,
            c.Products.Select(p => new ProductDto(
                p.Id, p.Name, p.Description, p.Price, p.Emoji, p.ImageUrl, p.Tags,
                p.ModifierGroups.Select(g => new ModifierGroupDto(
                    g.Id, g.Name, g.Type.ToString().ToLowerInvariant(), g.IsRequired, g.MaxSelect,
                    g.Options.Select(o => new ModifierOptionDto(o.Id, o.Name, o.Emoji, o.ExtraPrice))
                             .ToList()
                )).ToList()
            )).ToList()
        )).ToList();

        return Ok(result);
    }

    private static bool IsCurrentlyOpen(ICollection<Domain.Entities.BusinessHour> hours)
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        var today = (int)now.DayOfWeek;
        var hour = now.ToString("HH:mm");

        var todayHours = hours.FirstOrDefault(h => h.DayOfWeek == today);
        if (todayHours is null || !todayHours.IsOpen) return false;
        if (todayHours.OpensAt is null || todayHours.ClosesAt is null) return true;

        return string.Compare(hour, todayHours.OpensAt, StringComparison.Ordinal) >= 0 &&
               string.Compare(hour, todayHours.ClosesAt, StringComparison.Ordinal) < 0;
    }
}
