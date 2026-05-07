using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Store;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/store")]
public class StoreController(
    IAppDbContext db,
    MorfApp.Api.WebSocket.WebSocketConnectionManager wsManager) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<ActionResult<TenantPublicDto>> GetTenant(string slug)
    {
        var tenant = await db.Tenants
            .Include(t => t.Branding)
            .Include(t => t.DeliveryConfig)
            .Include(t => t.PaymentConfig)
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
            PaymentConfig: tenant.PaymentConfig is null
                ? new PaymentConfigDto(true, true, true, true, true, true)
                : new PaymentConfigDto(
                    DeliveryCash: tenant.PaymentConfig.DeliveryCash,
                    DeliveryTransfer: tenant.PaymentConfig.DeliveryTransfer,
                    DeliveryCard: tenant.PaymentConfig.DeliveryCard,
                    PickupCash: tenant.PaymentConfig.PickupCash,
                    PickupTransfer: tenant.PaymentConfig.PickupTransfer,
                    PickupCard: tenant.PaymentConfig.PickupCard
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
            c.Products.Select(p =>
            {
                var finalPrice = p.DiscountPercent is > 0
                    ? (decimal?)Math.Round(p.Price * (1 - p.DiscountPercent.Value / 100m), 0)
                    : null;
                return new ProductDto(
                    p.Id, p.Name, p.Description, p.Price, finalPrice, p.DiscountPercent, p.Emoji, p.ImageUrl, p.Tags,
                    p.ModifierGroups.Select(g => new ModifierGroupDto(
                        g.Id, g.Name, g.Type.ToString().ToLowerInvariant(), g.IsRequired, g.MaxSelect,
                        g.Options.Select(o => new ModifierOptionDto(o.Id, o.Name, o.Emoji, o.ExtraPrice))
                                 .ToList()
                    )).ToList()
                );
            }).ToList()
        )).ToList();

        return Ok(result);
    }

    [HttpGet("{slug}/promotions")]
    public async Task<List<PromotionDto>> GetPromotions(string slug)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == slug);
        if (tenant is null)
            return new();

        var promotions = await db.Promotions
            .Where(p => p.TenantId == tenant.Id && p.IsActive)
            .Include(p => p.ModifierGroups)
                .ThenInclude(mg => mg.Options)
            .OrderBy(p => p.SortOrder)
            .ToListAsync();

        var allProducts = await db.Products
            .Where(p => p.TenantId == tenant.Id)
            .Include(p => p.ModifierGroups)
                .ThenInclude(mg => mg.Options)
            .ToListAsync();

        return promotions.Select(promo =>
        {
            var products = promo.ProductIds
                .Select(id => allProducts.FirstOrDefault(p => p.Id == id))
                .Where(p => p != null)
                .Cast<Product>()
                .ToList();
            return MapPromotionPublic(promo, products);
        })
        .Where(dto => dto.Price > 0 && dto.Products.Count > 0)
        .ToList();
    }

    [HttpPost("{slug}/promotions/{promoId}/redemptions")]
    public async Task<IActionResult> RegisterRedemption(string slug, string promoId, [FromBody] RegisterRedemptionRequest req)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == slug);
        if (tenant is null)
            return NotFound();

        var promo = await db.Promotions
            .FirstOrDefaultAsync(p => p.Id == promoId && p.TenantId == tenant.Id);
        if (promo is null)
            return NotFound();

        // Normalizar teléfono (solo dígitos)
        var normalizedPhone = string.Concat(req.PhoneNumber.Where(char.IsDigit));

        // Contar redemptions existentes
        var used = await db.PromoRedemptions
            .Where(r => r.PromotionId == promoId && r.PhoneNumber == normalizedPhone)
            .SumAsync(r => r.Quantity);

        // Verificar límite
        if (promo.MaxPerUser.HasValue && used + req.Quantity > promo.MaxPerUser)
        {
            return StatusCode(409, new RedemptionStatusDto(used, promo.MaxPerUser, false));
        }

        // Insertar redemption
        var redemption = new PromoRedemption
        {
            Id = Guid.NewGuid().ToString(),
            PromotionId = promoId,
            TenantId = tenant.Id,
            PhoneNumber = normalizedPhone,
            Quantity = req.Quantity,
            CreatedAt = DateTime.UtcNow
        };

        db.PromoRedemptions.Add(redemption);
        await db.SaveChangesAsync();

        return Ok(new RedemptionStatusDto(used + req.Quantity, promo.MaxPerUser, true));
    }

    [HttpGet("{slug}/promotions/{promoId}/redemption-status")]
    public async Task<IActionResult> GetRedemptionStatus(string slug, string promoId, [FromQuery] string phone)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == slug);
        if (tenant is null)
            return NotFound();

        var promo = await db.Promotions
            .FirstOrDefaultAsync(p => p.Id == promoId && p.TenantId == tenant.Id);
        if (promo is null)
            return NotFound();

        var normalizedPhone = string.Concat(phone.Where(char.IsDigit));
        var used = await db.PromoRedemptions
            .Where(r => r.PromotionId == promoId && r.PhoneNumber == normalizedPhone)
            .SumAsync(r => r.Quantity);

        return Ok(new RedemptionStatusDto(used, promo.MaxPerUser, !promo.MaxPerUser.HasValue || used < promo.MaxPerUser));
    }

    private static PromotionDto MapPromotionPublic(Promotion p, List<Product> products)
    {
        var originalPrice = p.ProductIds.Distinct().Sum(id =>
        {
            var product = products.FirstOrDefault(prod => prod.Id == id);
            var count = p.ProductIds.Count(x => x == id);
            return (product?.Price ?? 0) * count;
        });
        var discountPercent = originalPrice == 0 ? 0 : Math.Round((originalPrice - p.Price) / originalPrice * 100, 0);
        return new PromotionDto(
            p.Id, p.Name, p.Description, p.Price, p.Emoji, p.ImageUrl, p.SortOrder, p.MaxPerUser,
            originalPrice, discountPercent,
            products.Select(prod =>
            {
                var finalPrice = prod.DiscountPercent is > 0
                    ? (decimal?)Math.Round(prod.Price * (1 - prod.DiscountPercent.Value / 100m), 0)
                    : null;
                return new ProductDto(
                    prod.Id, prod.Name, prod.Description, prod.Price, finalPrice, prod.DiscountPercent, prod.Emoji, prod.ImageUrl, prod.Tags,
                    prod.ModifierGroups.Select(g => new ModifierGroupDto(
                        g.Id, g.Name, g.Type.ToString().ToLowerInvariant(), g.IsRequired, g.MaxSelect,
                        g.Options.Select(o => new ModifierOptionDto(o.Id, o.Name, o.Emoji, o.ExtraPrice))
                                 .ToList()
                    )).ToList()
                );
            }).ToList(),
            p.ModifierGroups.Select(g => new ModifierGroupDto(
                g.Id, g.Name, g.Type.ToString().ToLowerInvariant(), g.IsRequired, g.MaxSelect,
                g.Options.Select(o => new ModifierOptionDto(o.Id, o.Name, o.Emoji, o.ExtraPrice))
                         .ToList()
            )).ToList()
        );
    }

    // POST /api/store/{slug}/orders
    // Crea un nuevo pedido para el tenant identificado por slug.
    // No requiere autenticación — endpoint público para clientes.
    [HttpPost("{slug}/orders")]
    public async Task<ActionResult<CreateOrderResponse>> CreateOrder(string slug, [FromBody] CreateOrderRequest req)
    {
        // 1. Validar campos obligatorios
        if (req.Items is null || req.Items.Count == 0)
            return BadRequest(new { message = "El pedido debe tener al menos un item." });

        if (string.IsNullOrWhiteSpace(req.CustomerName))
            return BadRequest(new { message = "El nombre del cliente es obligatorio." });

        if (string.IsNullOrWhiteSpace(req.CustomerPhone))
            return BadRequest(new { message = "El teléfono del cliente es obligatorio." });

        var mode = req.DeliveryMode?.ToLowerInvariant();
        if (mode != "delivery" && mode != "pickup")
            return BadRequest(new { message = "deliveryMode debe ser 'delivery' o 'pickup'." });

        if (mode == "delivery" && string.IsNullOrWhiteSpace(req.Address))
            return BadRequest(new { message = "La dirección es obligatoria para delivery." });

        // 2. Buscar tenant por slug
        var tenant = await db.Tenants
            .FirstOrDefaultAsync(t => t.Slug == slug && t.Status != TenantStatus.Suspended);

        if (tenant is null)
            return NotFound(new { message = "Tienda no encontrada." });

        // 3. Normalizar teléfono (solo dígitos)
        var normalizedPhone = string.Concat(req.CustomerPhone.Where(char.IsDigit));

        // 4. Construir items como value objects (snapshot)
        var items = req.Items.Select(i => new OrderItem
        {
            ProductId   = i.ProductId,
            ProductName = i.ProductName,
            Quantity    = i.Quantity,
            UnitPrice   = i.Price + i.ExtraPrice,
            Modifiers   = new List<OrderItemModifier>()
        }).ToList();

        // 5. Crear el pedido
        var order = new Order
        {
            Id            = Guid.NewGuid().ToString(),
            TenantId      = tenant.Id,
            CustomerName  = req.CustomerName.Trim(),
            CustomerPhone = normalizedPhone,
            Items         = items,
            TotalPrice    = req.Total,
            DeliveryMode  = mode,
            Address       = mode == "delivery" ? req.Address?.Trim() : null,
            Notes         = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            PaymentMethod = string.IsNullOrWhiteSpace(req.PaymentMethod) ? null : req.PaymentMethod.Trim().ToLowerInvariant(),
            Status        = OrderStatus.Pending,
            CreatedAt     = DateTime.UtcNow
        };

        try
        {
            db.Orders.Add(order);
            await db.SaveChangesAsync();

            // Emitir evento WebSocket
            await wsManager.BroadcastToTenantAsync(tenant.Id, new MorfApp.Api.WebSocket.WebSocketEvent
            {
                Type = "new_order",
                Data = new { orderId = order.Id, customerName = order.CustomerName, totalPrice = order.TotalPrice }
            });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Error al guardar el pedido. Intente nuevamente." });
        }

        return Ok(new CreateOrderResponse(order.Id, true));
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
