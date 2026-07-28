using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController(IAppDbContext db, IConfiguration config, IWebHostEnvironment env, MorfApp.Api.WebSocket.WebSocketConnectionManager wsManager) : ControllerBase
{
    private string TenantId => User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException();

    // ── Tenant info ──────────────────────────────────────────────────────────

    [HttpGet("me")]
    public async Task<ActionResult<TenantInfoDto>> GetMe(CancellationToken ct = default)
    {
        var tenant = await db.Tenants
            .Include(t => t.Branding)
            .Include(t => t.DeliveryConfig)
            .Include(t => t.PaymentConfig)
            .Include(t => t.BusinessHours)
            .FirstOrDefaultAsync(t => t.Id == TenantId, ct);

        if (tenant is null) return NotFound();

        return Ok(MapTenantInfo(tenant));
    }

    [HttpPut("me")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateTenantRequest req, CancellationToken ct = default)
    {
        var tenant = await db.Tenants.FindAsync(new object[] { TenantId }, ct);
        if (tenant is null) return NotFound();

        tenant.Name = req.Name;
        tenant.WhatsappNumber = req.WhatsappNumber;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("branding")]
    [Authorize(Policy = "OwnerOnly")]
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
    [Authorize(Policy = "OwnerOnly")]
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
    [Authorize(Policy = "OwnerOnly")]
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

    [HttpPut("plan")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> UpdatePlan([FromBody] UpdatePlanRequest req)
    {
        var tenant = await db.Tenants.FindAsync(TenantId);
        if (tenant is null) return NotFound();

        if (!Enum.TryParse<TenantPlan>(req.Plan, out var plan))
            return BadRequest(new { message = "Plan inválido. Opciones: Basico, Pro, Negocio" });

        tenant.Plan = plan;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/admin/tenant/pause
    // Pausa o reanuda la tienda de forma inmediata, sin importar el horario configurado.
    // Mientras IsPaused=true, StoreController.IsCurrentlyOpen()/GetTenant fuerzan isOpen=false
    // y CreateOrder rechaza pedidos nuevos con 409 STORE_CLOSED.
    [HttpPut("tenant/pause")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> UpdateTenantPause([FromBody] UpdateTenantPauseRequest req)
    {
        var tenant = await db.Tenants
            .Include(t => t.BusinessHours)
            .FirstOrDefaultAsync(t => t.Id == TenantId);
        if (tenant is null) return NotFound();

        tenant.IsPaused = req.IsPaused;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var isOpen = !tenant.IsPaused && StoreController.IsCurrentlyOpen(tenant.BusinessHours);
        await wsManager.BroadcastToPublicAsync(TenantId, new MorfApp.Api.WebSocket.WebSocketEvent
        {
            Type = "store_status",
            Data = new { isOpen }
        });

        return Ok(new { isPaused = tenant.IsPaused });
    }

    [HttpPut("whatsapp-template")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> UpdateWhatsAppTemplate([FromBody] UpdateWhatsAppTemplateRequest req)
    {
        var tenant = await db.Tenants.FindAsync(TenantId);
        if (tenant is null) return NotFound();

        tenant.WhatsAppMessageTemplate = req.Template;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("payment")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> UpdatePayment([FromBody] UpdatePaymentRequest req)
    {
        var payment = await db.PaymentConfigs.FirstOrDefaultAsync(p => p.TenantId == TenantId);
        if (payment is null)
        {
            db.PaymentConfigs.Add(new PaymentConfig
            {
                TenantId = TenantId,
                DeliveryCash = req.DeliveryCash,
                DeliveryTransfer = req.DeliveryTransfer,
                DeliveryCard = req.DeliveryCard,
                PickupCash = req.PickupCash,
                PickupTransfer = req.PickupTransfer,
                PickupCard = req.PickupCard
            });
        }
        else
        {
            payment.DeliveryCash = req.DeliveryCash;
            payment.DeliveryTransfer = req.DeliveryTransfer;
            payment.DeliveryCard = req.DeliveryCard;
            payment.PickupCash = req.PickupCash;
            payment.PickupTransfer = req.PickupTransfer;
            payment.PickupCard = req.PickupCard;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Categories ───────────────────────────────────────────────────────────

    [HttpGet("categories")]
    public async Task<ActionResult<List<CategoryAdminDto>>> GetCategories(CancellationToken ct = default)
    {
        var cats = await db.Categories
            .Where(c => c.TenantId == TenantId)
            .OrderBy(c => c.SortOrder)
            .Include(c => c.Products.OrderBy(p => p.SortOrder))
                .ThenInclude(p => p.ModifierGroups)
            .ToListAsync(ct);

        return Ok(cats.Select(MapCategory).ToList());
    }

    [HttpPost("categories")]
    public async Task<ActionResult<CategoryAdminDto>> CreateCategory([FromBody] CreateCategoryRequest req, CancellationToken ct = default)
    {
        var cat = new Category
        {
            TenantId = TenantId,
            Name = req.Name,
            Emoji = req.Emoji ?? "🍽️",
            SortOrder = req.SortOrder
        };
        db.Categories.Add(cat);
        await db.SaveChangesAsync(ct);

        var created = await db.Categories
            .Include(c => c.Products)
                .ThenInclude(p => p.ModifierGroups)
            .FirstAsync(c => c.Id == cat.Id, ct);
        return Created($"/api/admin/categories/{cat.Id}", MapCategory(created));
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateCategoryRequest req, CancellationToken ct = default)
    {
        var cat = await db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == TenantId, ct);
        if (cat is null) return NotFound();

        cat.Name = req.Name;
        cat.Emoji = req.Emoji ?? "🍽️";
        cat.SortOrder = req.SortOrder;
        cat.IsActive = req.IsActive;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(string id, CancellationToken ct = default)
    {
        var cat = await db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == TenantId, ct);
        if (cat is null) return NotFound();

        db.Categories.Remove(cat);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Products ─────────────────────────────────────────────────────────────

    [HttpPost("products")]
    public async Task<ActionResult<ProductAdminDto>> CreateProduct([FromBody] CreateProductRequest req, CancellationToken ct = default)
    {
        var catExists = await db.Categories
            .AnyAsync(c => c.Id == req.CategoryId && c.TenantId == TenantId, ct);
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
            IsOutOfStock = req.IsOutOfStock,
            Tags = req.Tags
        };
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return Created($"/api/admin/products/{product.Id}", MapProduct(product));
    }

    [HttpPut("products/{id}")]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] UpdateProductRequest req, CancellationToken ct = default)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId, ct);
        if (product is null) return NotFound();

        product.CategoryId = req.CategoryId;
        product.Name = req.Name;
        product.Description = req.Description;
        product.Price = req.Price;
        product.Emoji = req.Emoji;
        product.ImageUrl = req.ImageUrl;
        product.SortOrder = req.SortOrder;
        product.IsActive = req.IsActive;
        product.IsOutOfStock = req.IsOutOfStock;
        product.Tags = req.Tags;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("products/{id}/discount")]
    public async Task<IActionResult> UpdateProductDiscount(string id, [FromBody] UpdateProductDiscountRequest req, CancellationToken ct = default)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId, ct);
        if (product is null) return NotFound();

        product.DiscountPercent = req.DiscountPercent is > 0 ? req.DiscountPercent : null;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("products/{id}/modifier-groups")]
    public async Task<IActionResult> UpdateProductModifierGroups(string id, [FromBody] UpdateProductModifierGroupsRequest req, CancellationToken ct = default)
    {
        var product = await db.Products
            .Include(p => p.ModifierGroups)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId, ct);
        if (product is null) return NotFound();

        var newGroups = await db.ModifierGroups
            .Where(g => req.ModifierGroupIds.Contains(g.Id) && g.TenantId == TenantId)
            .ToListAsync(ct);

        product.ModifierGroups.Clear();
        foreach (var group in newGroups)
            product.ModifierGroups.Add(group);

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("products/{id}")]
    public async Task<IActionResult> DeleteProduct(string id, CancellationToken ct = default)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId, ct);
        if (product is null) return NotFound();

        db.Products.Remove(product);
        await db.SaveChangesAsync(ct);
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
        t.Id, t.Slug, t.Name, t.WhatsappNumber, t.WhatsAppMessageTemplate, t.Plan.ToString(), t.IsPaused,
        t.SubscriptionEndsAt.HasValue
            ? (int?)Math.Floor((t.SubscriptionEndsAt.Value - DateTime.UtcNow).TotalDays)
            : null,
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
        t.PaymentConfig is null ? new PaymentAdminDto(true, true, true, true, true, true) : new PaymentAdminDto(
            t.PaymentConfig.DeliveryCash, t.PaymentConfig.DeliveryTransfer, t.PaymentConfig.DeliveryCard,
            t.PaymentConfig.PickupCash, t.PaymentConfig.PickupTransfer, t.PaymentConfig.PickupCard
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
        p.Price, p.DiscountPercent, p.Emoji, p.ImageUrl, p.SortOrder, p.IsActive, p.IsOutOfStock, p.Tags,
        p.ModifierGroups.Select(g => g.Id).ToList()
    );

    private static ModifierGroupAdminDto MapModifierGroup(ModifierGroup g) => new(
        g.Id, g.Name, g.Type.ToString(), g.IsRequired, g.MaxSelect, g.SortOrder,
        g.Options.Select(o => new ModifierOptionAdminDto(
            o.Id, o.Name, o.Emoji, o.ExtraPrice, o.SortOrder, o.IsActive
        )).ToList()
    );

    // ── Promotions ────────────────────────────────────────────────────────────

    [HttpGet("promotions")]
    public async Task<List<PromotionAdminDto>> GetPromotions(CancellationToken ct = default)
    {
        var promotions = await db.Promotions
            .Where(p => p.TenantId == TenantId)
            .Include(p => p.ModifierGroups)
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);

        var neededProductIds = promotions.SelectMany(p => p.ProductIds).Distinct().ToList();
        var allProducts = neededProductIds.Count == 0
            ? new List<Product>()
            : await db.Products
                .Where(p => p.TenantId == TenantId && neededProductIds.Contains(p.Id))
                .ToListAsync(ct);

        return promotions.Select(promo =>
        {
            var originalPrice = promo.ProductIds.Distinct().Sum(id =>
            {
                var product = allProducts.FirstOrDefault(p => p.Id == id);
                var count = promo.ProductIds.Count(x => x == id);
                return (product?.Price ?? 0) * count;
            });
            return MapPromotion(promo, originalPrice);
        }).ToList();
    }

    [HttpPost("promotions")]
    public async Task<IActionResult> CreatePromotion([FromBody] CreatePromotionRequest req)
    {
        // Validar que todos los productos pertenecen al tenant (permitir duplicados)
        var productCounts = req.ProductIds.GroupBy(x => x).ToDictionary(g => g.Key, g => g.Count());
        var uniqueProductIds = productCounts.Keys.ToList();
        var existingProducts = await db.Products
            .Where(p => p.TenantId == TenantId && uniqueProductIds.Contains(p.Id))
            .ToListAsync();
        if (existingProducts.Count != uniqueProductIds.Count)
            return BadRequest("Some products don't belong to this tenant");

        // Validar que todos los modifier groups pertenecen al tenant
        var modifierGroupIds = new HashSet<string>(req.ModifierGroupIds ?? new List<string>());
        var existingModifierGroups = await db.ModifierGroups
            .Where(mg => mg.TenantId == TenantId && modifierGroupIds.Contains(mg.Id))
            .ToListAsync();
        if (modifierGroupIds.Count > 0 && existingModifierGroups.Count != modifierGroupIds.Count)
            return BadRequest("Some modifier groups don't belong to this tenant");

        var originalPrice = existingProducts.Sum(x => x.Price * productCounts[x.Id]);
        var discountedPrice = originalPrice == 0 ? 0 : Math.Round(originalPrice * (1M - req.DiscountPercent / 100M));

        var promo = new Promotion
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = TenantId,
            Name = req.Name,
            Description = req.Description,
            Price = discountedPrice,
            Emoji = req.Emoji ?? "🎁",
            ImageUrl = req.ImageUrl,
            SortOrder = req.SortOrder,
            IsActive = req.IsActive,
            MaxPerUser = req.MaxPerUser,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ProductIds = req.ProductIds
        };

        db.Promotions.Add(promo);
        await db.SaveChangesAsync();

        // Add modifier groups after saving
        foreach (var group in existingModifierGroups)
            promo.ModifierGroups.Add(group);
        await db.SaveChangesAsync();

        return Created($"api/admin/promotions/{promo.Id}", MapPromotion(promo, originalPrice));
    }

    [HttpPut("promotions/{id}")]
    public async Task<IActionResult> UpdatePromotion(string id, [FromBody] UpdatePromotionRequest req)
    {
        var promo = await db.Promotions
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId);
        if (promo is null)
            return NotFound();

        var uniqueProductIds = promo.ProductIds.Distinct().ToList();
        var products = await db.Products
            .Where(p => p.TenantId == TenantId && uniqueProductIds.Contains(p.Id))
            .ToListAsync();
        var productCounts = promo.ProductIds.GroupBy(x => x).ToDictionary(g => g.Key, g => g.Count());
        var originalPrice = products.Sum(x => x.Price * productCounts[x.Id]);
        var discountedPrice = originalPrice == 0 ? 0 : Math.Round(originalPrice * (1M - req.DiscountPercent / 100M));

        promo.Name = req.Name;
        promo.Description = req.Description;
        promo.Price = discountedPrice;
        promo.Emoji = req.Emoji ?? promo.Emoji;
        promo.ImageUrl = req.ImageUrl;
        promo.SortOrder = req.SortOrder;
        promo.IsActive = req.IsActive;
        promo.MaxPerUser = req.MaxPerUser;
        promo.UpdatedAt = DateTime.UtcNow;

        db.Promotions.Update(promo);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("promotions/{id}/products")]
    public async Task<IActionResult> UpdatePromotionProducts(string id, [FromBody] UpdatePromotionProductsRequest req)
    {
        var promo = await db.Promotions
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId);
        if (promo is null)
            return NotFound();

        // Validar productos (permitir duplicados)
        var productCounts = req.ProductIds.GroupBy(x => x).ToDictionary(g => g.Key, g => g.Count());
        var uniqueProductIds = productCounts.Keys.ToList();
        var existingProducts = await db.Products
            .Where(p => p.TenantId == TenantId && uniqueProductIds.Contains(p.Id))
            .ToListAsync();
        if (existingProducts.Count != uniqueProductIds.Count)
            return BadRequest("Some products don't belong to this tenant");

        // Asignar IDs directamente (puede tener duplicados)
        promo.ProductIds = req.ProductIds;
        promo.UpdatedAt = DateTime.UtcNow;
        db.Promotions.Update(promo);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("promotions/{id}/modifier-groups")]
    public async Task<IActionResult> UpdatePromotionModifierGroups(string id, [FromBody] UpdatePromotionModifierGroupsRequest req)
    {
        var promo = await db.Promotions
            .Include(p => p.ModifierGroups)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId);
        if (promo is null)
            return NotFound();

        // Validar modifier groups
        var modifierGroupIds = new HashSet<string>(req.ModifierGroupIds ?? new List<string>());
        var existingModifierGroups = await db.ModifierGroups
            .Where(mg => mg.TenantId == TenantId && modifierGroupIds.Contains(mg.Id))
            .ToListAsync();
        if (modifierGroupIds.Count > 0 && existingModifierGroups.Count != modifierGroupIds.Count)
            return BadRequest("Some modifier groups don't belong to this tenant");

        // Clear + re-add
        promo.ModifierGroups.Clear();
        foreach (var group in existingModifierGroups)
            promo.ModifierGroups.Add(group);

        promo.UpdatedAt = DateTime.UtcNow;
        db.Promotions.Update(promo);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("promotions/{id}")]
    public async Task<IActionResult> DeletePromotion(string id)
    {
        var promo = await db.Promotions.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId);
        if (promo is null)
            return NotFound();

        db.Promotions.Remove(promo);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Product Supplies ─────────────────────────────────────────────────────

    [HttpGet("products/{productId}/supplies")]
    public async Task<ActionResult<List<ProductSupplyDto>>> GetProductSupplies(string productId)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId && p.TenantId == TenantId);
        if (product is null) return NotFound();

        var productSupplies = await db.ProductSupplies
            .Where(ps => ps.ProductId == productId && ps.TenantId == TenantId)
            .ToListAsync();

        var supplyIds = productSupplies.Select(ps => ps.SupplyId).ToList();
        var supplies = await db.Supplies
            .Where(s => s.TenantId == TenantId && supplyIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id);

        var result = productSupplies.Select(ps => new ProductSupplyDto
        {
            SupplyId = ps.SupplyId,
            SupplyName = supplies.TryGetValue(ps.SupplyId, out var s) ? s.Name : "",
            Unit = supplies.TryGetValue(ps.SupplyId, out var s2) ? s2.Unit : null,
            QuantityRequired = ps.QuantityRequired,
            IsUnknownQuantity = ps.IsUnknownQuantity
        }).ToList();

        return Ok(result);
    }

    [HttpPut("products/{productId}/supplies")]
    public async Task<IActionResult> UpdateProductSupplies(string productId, [FromBody] UpdateProductSuppliesRequest req)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId && p.TenantId == TenantId);
        if (product is null) return NotFound();

        // Verificar que todos los SupplyIds existan y pertenezcan al tenant
        var supplyIds = req.Supplies.Select(s => s.SupplyId).ToList();
        var validSupplies = await db.Supplies
            .Where(s => supplyIds.Contains(s.Id) && s.TenantId == TenantId && s.IsActive)
            .Select(s => s.Id)
            .ToListAsync();

        if (validSupplies.Count != supplyIds.Distinct().Count())
            return BadRequest(new { message = "Uno o más insumos no son válidos." });

        // Limpiar y reemplazar
        var existing = db.ProductSupplies.Where(ps => ps.ProductId == productId && ps.TenantId == TenantId);
        db.ProductSupplies.RemoveRange(existing);

        foreach (var item in req.Supplies)
        {
            db.ProductSupplies.Add(new ProductSupply
            {
                TenantId = TenantId,
                ProductId = productId,
                SupplyId = item.SupplyId,
                QuantityRequired = item.QuantityRequired,
                IsUnknownQuantity = item.IsUnknownQuantity
            });
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static PromotionAdminDto MapPromotion(Promotion p, decimal originalPrice)
    {
        var discountPercent = originalPrice == 0 ? 0 : Math.Round((originalPrice - p.Price) / originalPrice * 100, 0);
        return new PromotionAdminDto(
            p.Id, p.Name, p.Description, p.Price, p.Emoji, p.ImageUrl, p.SortOrder, p.IsActive, p.MaxPerUser,
            originalPrice, discountPercent,
            p.ProductIds,
            p.ModifierGroups.Select(x => x.Id).ToList()
        );
    }
}
