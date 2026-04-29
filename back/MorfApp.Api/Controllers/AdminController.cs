using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.Security.Claims;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController(IAppDbContext db, IConfiguration config, IWebHostEnvironment env) : ControllerBase
{
    private string TenantId => User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException();

    // ── Tenant info ──────────────────────────────────────────────────────────

    [HttpGet("me")]
    public async Task<ActionResult<TenantInfoDto>> GetMe()
    {
        var tenant = await db.Tenants
            .Include(t => t.Branding)
            .Include(t => t.DeliveryConfig)
            .Include(t => t.BusinessHours)
            .FirstOrDefaultAsync(t => t.Id == TenantId);

        if (tenant is null) return NotFound();

        return Ok(MapTenantInfo(tenant));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateTenantRequest req)
    {
        var tenant = await db.Tenants.FindAsync(TenantId);
        if (tenant is null) return NotFound();

        tenant.Name = req.Name;
        tenant.WhatsappNumber = req.WhatsappNumber;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("branding")]
    public async Task<IActionResult> UpdateBranding([FromBody] UpdateBrandingRequest req)
    {
        var branding = await db.TenantBrandings.FirstOrDefaultAsync(b => b.TenantId == TenantId);
        if (branding is null)
        {
            db.TenantBrandings.Add(new TenantBranding
            {
                TenantId = TenantId,
                ColorPrimary = req.ColorPrimary,
                ColorAccent = req.ColorAccent,
                LogoUrl = req.LogoUrl,
                BannerUrl = req.BannerUrl,
                Tagline = req.Tagline,
                EmojiIcon = req.EmojiIcon
            });
        }
        else
        {
            branding.ColorPrimary = req.ColorPrimary;
            branding.ColorAccent = req.ColorAccent;
            branding.LogoUrl = req.LogoUrl;
            branding.BannerUrl = req.BannerUrl;
            branding.Tagline = req.Tagline;
            branding.EmojiIcon = req.EmojiIcon;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("delivery")]
    public async Task<IActionResult> UpdateDelivery([FromBody] UpdateDeliveryRequest req)
    {
        if (!Enum.TryParse<DeliveryMode>(req.Mode, out var mode))
            return BadRequest(new { message = "Modo de delivery inválido" });

        var delivery = await db.DeliveryConfigs.FirstOrDefaultAsync(d => d.TenantId == TenantId);
        if (delivery is null)
        {
            db.DeliveryConfigs.Add(new DeliveryConfig
            {
                TenantId = TenantId,
                Mode = mode,
                DeliveryCost = req.DeliveryCost,
                FreeDeliveryFrom = req.FreeDeliveryFrom,
                MinOrderAmount = req.MinOrderAmount,
                EstimatedMinutes = req.EstimatedMinutes,
                PickupAddress = req.PickupAddress
            });
        }
        else
        {
            delivery.Mode = mode;
            delivery.DeliveryCost = req.DeliveryCost;
            delivery.FreeDeliveryFrom = req.FreeDeliveryFrom;
            delivery.MinOrderAmount = req.MinOrderAmount;
            delivery.EstimatedMinutes = req.EstimatedMinutes;
            delivery.PickupAddress = req.PickupAddress;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("hours")]
    public async Task<IActionResult> UpdateHours([FromBody] UpdateHoursRequest req)
    {
        var existing = await db.BusinessHours
            .Where(h => h.TenantId == TenantId)
            .ToListAsync();

        foreach (var dto in req.Hours)
        {
            var hour = existing.FirstOrDefault(h => h.DayOfWeek == dto.DayOfWeek);
            if (hour is null)
            {
                db.BusinessHours.Add(new BusinessHour
                {
                    TenantId = TenantId,
                    DayOfWeek = dto.DayOfWeek,
                    IsOpen = dto.IsOpen,
                    OpensAt = dto.OpensAt,
                    ClosesAt = dto.ClosesAt
                });
            }
            else
            {
                hour.IsOpen = dto.IsOpen;
                hour.OpensAt = dto.OpensAt;
                hour.ClosesAt = dto.ClosesAt;
            }
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Categories ───────────────────────────────────────────────────────────

    [HttpGet("categories")]
    public async Task<ActionResult<List<CategoryAdminDto>>> GetCategories()
    {
        var cats = await db.Categories
            .Where(c => c.TenantId == TenantId)
            .OrderBy(c => c.SortOrder)
            .Include(c => c.Products.OrderBy(p => p.SortOrder))
                .ThenInclude(p => p.ModifierGroups)
            .ToListAsync();

        return Ok(cats.Select(MapCategory).ToList());
    }

    [HttpPost("categories")]
    public async Task<ActionResult<CategoryAdminDto>> CreateCategory([FromBody] CreateCategoryRequest req)
    {
        var cat = new Category
        {
            TenantId = TenantId,
            Name = req.Name,
            Emoji = req.Emoji ?? "🍽️",
            SortOrder = req.SortOrder
        };
        db.Categories.Add(cat);
        await db.SaveChangesAsync();

        var created = await db.Categories
            .Include(c => c.Products)
                .ThenInclude(p => p.ModifierGroups)
            .FirstAsync(c => c.Id == cat.Id);
        return Created($"/api/admin/categories/{cat.Id}", MapCategory(created));
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateCategoryRequest req)
    {
        var cat = await db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == TenantId);
        if (cat is null) return NotFound();

        cat.Name = req.Name;
        cat.Emoji = req.Emoji ?? "🍽️";
        cat.SortOrder = req.SortOrder;
        cat.IsActive = req.IsActive;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        var cat = await db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == TenantId);
        if (cat is null) return NotFound();

        db.Categories.Remove(cat);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Products ─────────────────────────────────────────────────────────────

    [HttpPost("products")]
    public async Task<ActionResult<ProductAdminDto>> CreateProduct([FromBody] CreateProductRequest req)
    {
        var catExists = await db.Categories
            .AnyAsync(c => c.Id == req.CategoryId && c.TenantId == TenantId);
        if (!catExists) return BadRequest(new { message = "Categoría no encontrada" });

        var product = new Product
        {
            TenantId = TenantId,
            CategoryId = req.CategoryId,
            Name = req.Name,
            Description = req.Description,
            Price = req.Price,
            Emoji = req.Emoji,
            ImageUrl = req.ImageUrl,
            SortOrder = req.SortOrder,
            IsActive = req.IsActive,
            Tags = req.Tags
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return Created($"/api/admin/products/{product.Id}", MapProduct(product));
    }

    [HttpPut("products/{id}")]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] UpdateProductRequest req)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId);
        if (product is null) return NotFound();

        product.CategoryId = req.CategoryId;
        product.Name = req.Name;
        product.Description = req.Description;
        product.Price = req.Price;
        product.Emoji = req.Emoji;
        product.ImageUrl = req.ImageUrl;
        product.SortOrder = req.SortOrder;
        product.IsActive = req.IsActive;
        product.Tags = req.Tags;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("products/{id}/modifier-groups")]
    public async Task<IActionResult> UpdateProductModifierGroups(string id, [FromBody] UpdateProductModifierGroupsRequest req)
    {
        var product = await db.Products
            .Include(p => p.ModifierGroups)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId);
        if (product is null) return NotFound();

        var newGroups = await db.ModifierGroups
            .Where(g => req.ModifierGroupIds.Contains(g.Id) && g.TenantId == TenantId)
            .ToListAsync();

        product.ModifierGroups.Clear();
        foreach (var group in newGroups)
            product.ModifierGroups.Add(group);

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("products/{id}")]
    public async Task<IActionResult> DeleteProduct(string id)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId);
        if (product is null) return NotFound();

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Modifier Groups ───────────────────────────────────────────────────────

    [HttpGet("modifier-groups")]
    public async Task<ActionResult<List<ModifierGroupAdminDto>>> GetModifierGroups()
    {
        var groups = await db.ModifierGroups
            .Where(g => g.TenantId == TenantId)
            .OrderBy(g => g.SortOrder)
            .Include(g => g.Options.OrderBy(o => o.SortOrder))
            .ToListAsync();

        return Ok(groups.Select(MapModifierGroup).ToList());
    }

    [HttpPost("modifier-groups")]
    public async Task<ActionResult<ModifierGroupAdminDto>> CreateModifierGroup([FromBody] CreateModifierGroupRequest req)
    {
        if (!Enum.TryParse<ModifierType>(req.Type, true, out var type))
            return BadRequest(new { message = "Tipo inválido. Usar 'Single' o 'Multiple'" });

        var group = new ModifierGroup
        {
            TenantId = TenantId,
            Name = req.Name,
            Type = type,
            IsRequired = req.IsRequired,
            MaxSelect = req.MaxSelect,
            SortOrder = req.SortOrder,
        };

        foreach (var (opt, i) in req.Options.Select((o, i) => (o, i)))
        {
            group.Options.Add(new ModifierOption
            {
                Name = opt.Name,
                Emoji = opt.Emoji,
                ExtraPrice = opt.ExtraPrice,
                SortOrder = opt.SortOrder == 0 ? i : opt.SortOrder,
            });
        }

        db.ModifierGroups.Add(group);
        await db.SaveChangesAsync();

        var created = await db.ModifierGroups
            .Include(g => g.Options.OrderBy(o => o.SortOrder))
            .FirstAsync(g => g.Id == group.Id);

        return Created($"/api/admin/modifier-groups/{group.Id}", MapModifierGroup(created));
    }

    [HttpPut("modifier-groups/{id}")]
    public async Task<IActionResult> UpdateModifierGroup(string id, [FromBody] UpdateModifierGroupRequest req)
    {
        if (!Enum.TryParse<ModifierType>(req.Type, true, out var type))
            return BadRequest(new { message = "Tipo inválido. Usar 'Single' o 'Multiple'" });

        var group = await db.ModifierGroups
            .Include(g => g.Options)
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == TenantId);
        if (group is null) return NotFound();

        group.Name = req.Name;
        group.Type = type;
        group.IsRequired = req.IsRequired;
        group.MaxSelect = req.MaxSelect;
        group.SortOrder = req.SortOrder;

        // Upsert options
        var incomingIds = req.Options.Where(o => o.Id != null).Select(o => o.Id!).ToHashSet();
        var toDelete = group.Options.Where(o => !incomingIds.Contains(o.Id)).ToList();
        foreach (var del in toDelete)
            db.ModifierOptions.Remove(del);

        foreach (var (opt, i) in req.Options.Select((o, i) => (o, i)))
        {
            if (opt.Id != null)
            {
                var existing = group.Options.FirstOrDefault(o => o.Id == opt.Id);
                if (existing != null)
                {
                    existing.Name = opt.Name;
                    existing.Emoji = opt.Emoji;
                    existing.ExtraPrice = opt.ExtraPrice;
                    existing.SortOrder = opt.SortOrder == 0 ? i : opt.SortOrder;
                }
            }
            else
            {
                group.Options.Add(new ModifierOption
                {
                    GroupId = group.Id,
                    Name = opt.Name,
                    Emoji = opt.Emoji,
                    ExtraPrice = opt.ExtraPrice,
                    SortOrder = opt.SortOrder == 0 ? i : opt.SortOrder,
                });
            }
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("modifier-groups/{id}")]
    public async Task<IActionResult> DeleteModifierGroup(string id)
    {
        var group = await db.ModifierGroups
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == TenantId);
        if (group is null) return NotFound();

        db.ModifierGroups.Remove(group);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Image upload ─────────────────────────────────────────────────────────

    [HttpPost("upload")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        var allowed = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (file is null || !allowed.Contains(file.ContentType))
            return BadRequest(new { error = "Formato no permitido. Usá JPG, PNG, WebP o GIF." });
        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { error = "El archivo no puede superar 5 MB." });

        var uploadsPath = config["App:UploadsPath"];
        if (string.IsNullOrWhiteSpace(uploadsPath))
            uploadsPath = Path.Combine(env.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsPath);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp" or ".gif")) ext = ".jpg";
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsPath, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        var publicUrl = config["App:PublicUrl"] ?? "http://localhost:5500";
        return Ok(new { url = $"{publicUrl}/uploads/{fileName}" });
    }

    // ── Mappers ──────────────────────────────────────────────────────────────

    private static TenantInfoDto MapTenantInfo(Domain.Entities.Tenant t) => new(
        t.Id, t.Slug, t.Name, t.WhatsappNumber,
        t.Branding is null ? null : new BrandingAdminDto(
            t.Branding.ColorPrimary, t.Branding.ColorAccent,
            t.Branding.LogoUrl, t.Branding.BannerUrl,
            t.Branding.Tagline, t.Branding.EmojiIcon ?? "🍔"
        ),
        t.DeliveryConfig is null ? null : new DeliveryAdminDto(
            t.DeliveryConfig.Mode.ToString(),
            t.DeliveryConfig.DeliveryCost, t.DeliveryConfig.FreeDeliveryFrom,
            t.DeliveryConfig.MinOrderAmount, t.DeliveryConfig.EstimatedMinutes,
            t.DeliveryConfig.PickupAddress
        ),
        t.BusinessHours.OrderBy(h => h.DayOfWeek)
            .Select(h => new HourAdminDto(h.DayOfWeek, h.IsOpen, h.OpensAt, h.ClosesAt))
            .ToList()
    );

    private static CategoryAdminDto MapCategory(Category c) => new(
        c.Id, c.Name, c.Emoji, c.SortOrder, c.IsActive,
        c.Products.Select(MapProduct).ToList()
    );

    private static ProductAdminDto MapProduct(Product p) => new(
        p.Id, p.CategoryId, p.Name, p.Description,
        p.Price, p.Emoji, p.ImageUrl, p.SortOrder, p.IsActive, p.Tags,
        p.ModifierGroups.Select(g => g.Id).ToList()
    );

    private static ModifierGroupAdminDto MapModifierGroup(ModifierGroup g) => new(
        g.Id, g.Name, g.Type.ToString(), g.IsRequired, g.MaxSelect, g.SortOrder,
        g.Options.Select(o => new ModifierOptionAdminDto(
            o.Id, o.Name, o.Emoji, o.ExtraPrice, o.SortOrder, o.IsActive
        )).ToList()
    );
}
