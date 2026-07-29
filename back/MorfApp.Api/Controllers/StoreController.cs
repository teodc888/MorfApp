using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
    MorfApp.Api.WebSocket.WebSocketConnectionManager wsManager,
    ILogger<StoreController> logger) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<ActionResult<TenantPublicDto>> GetTenant(string slug, CancellationToken ct = default)
    {
        var tenant = await db.Tenants
            .Include(t => t.Branding)
            .Include(t => t.DeliveryConfig)
            .Include(t => t.PaymentConfig)
            .Include(t => t.BusinessHours)
            .FirstOrDefaultAsync(t => t.Slug == slug, ct);

        if (tenant is null || tenant.Status == TenantStatus.Suspended)
            return NotFound();

        if (tenant.Status == TenantStatus.Inactive)
            return StatusCode(403);

        var isOpen = !tenant.IsPaused && IsCurrentlyOpen(tenant.BusinessHours);

        var dto = new TenantPublicDto(
            Id: tenant.Id,
            Slug: tenant.Slug,
            Name: tenant.Name,
            WhatsappNumber: tenant.WhatsappNumber,
            WhatsAppMessageTemplate: tenant.WhatsAppMessageTemplate,
            IsOpen: isOpen,
            Status: tenant.Status.ToString(),
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
                .ToList(),
            MetaPixelId: tenant.MetaPixelEnabled ? tenant.MetaPixelId : null,
            GoogleAnalyticsId: tenant.GoogleAnalyticsEnabled ? tenant.GoogleAnalyticsId : null
        );

        return Ok(dto);
    }

    [HttpGet("{slug}/menu")]
    public async Task<ActionResult<List<CategoryDto>>> GetMenu(string slug, CancellationToken ct = default)
    {
        var tenant = await db.Tenants
            .FirstOrDefaultAsync(t => t.Slug == slug && t.Status != TenantStatus.Suspended, ct);

        if (tenant is null) return NotFound();
        if (tenant.Status == TenantStatus.Inactive) return StatusCode(403);

        var categories = await db.Categories
            .Where(c => c.Tenant.Slug == slug && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Include(c => c.Products.Where(p => p.IsActive).OrderBy(p => p.SortOrder))
                .ThenInclude(p => p.ModifierGroups.OrderBy(g => g.SortOrder))
                    .ThenInclude(g => g.Options.Where(o => o.IsActive).OrderBy(o => o.SortOrder))
            .ToListAsync(ct);

        var result = categories.Select(c => new CategoryDto(
            c.Id, c.Name, c.Emoji, c.SortOrder,
            c.Products.Select(p =>
            {
                var finalPrice = p.DiscountPercent is > 0
                    ? (decimal?)CalculateFinalPrice(p.Price, p.DiscountPercent)
                    : null;
                return new ProductDto(
                    p.Id, p.Name, p.Description, p.Price, finalPrice, p.DiscountPercent, p.Emoji, p.ImageUrls, p.Tags, p.IsOutOfStock,
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
    public async Task<List<PromotionDto>> GetPromotions(string slug, CancellationToken ct = default)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == slug, ct);
        if (tenant is null)
            return new();

        var promotions = await db.Promotions
            .Where(p => p.TenantId == tenant.Id && p.IsActive)
            .Include(p => p.ModifierGroups)
                .ThenInclude(mg => mg.Options)
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);

        var neededProductIds = promotions.SelectMany(p => p.ProductIds).Distinct().ToList();
        var allProducts = neededProductIds.Count == 0
            ? new List<Product>()
            : await db.Products
                .Where(p => p.TenantId == tenant.Id && neededProductIds.Contains(p.Id))
                .Include(p => p.ModifierGroups)
                    .ThenInclude(mg => mg.Options)
                .ToListAsync(ct);

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

    [HttpGet("{slug}/promotions/{promoId}/redemption-status")]
    public async Task<IActionResult> GetRedemptionStatus(string slug, string promoId, [FromQuery] string phone, CancellationToken ct = default)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == slug, ct);
        if (tenant is null)
            return NotFound();

        var promo = await db.Promotions
            .FirstOrDefaultAsync(p => p.Id == promoId && p.TenantId == tenant.Id, ct);
        if (promo is null)
            return NotFound();

        var normalizedPhone = string.Concat(phone.Where(char.IsDigit));
        var used = await db.PromoRedemptions
            .Where(r => r.PromotionId == promoId && r.PhoneNumber == normalizedPhone)
            .SumAsync(r => r.Quantity, ct);

        return Ok(new RedemptionStatusDto(used, promo.MaxPerUser, !promo.MaxPerUser.HasValue || used < promo.MaxPerUser));
    }

    // GET /api/store/{slug}/orders/{id}
    // Tracking público del pedido — sin autenticación. El cliente final consulta el estado de
    // SU pedido usando el GUID que recibió al crearlo. No enumerable: se busca únicamente por
    // id + slug del tenant. El teléfono del cliente se devuelve enmascarado (solo últimos 4 dígitos).
    [HttpGet("{slug}/orders/{id}")]
    public async Task<ActionResult<OrderTrackingDto>> GetOrderTracking(string slug, string id, CancellationToken ct = default)
    {
        var tenant = await db.Tenants
            .Include(t => t.DeliveryConfig)
            .FirstOrDefaultAsync(t => t.Slug == slug, ct);

        if (tenant is null)
            return NotFound();

        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == tenant.Id, ct);

        if (order is null)
            return NotFound();

        return Ok(MapOrderTracking(order, tenant.DeliveryConfig?.EstimatedMinutes));
    }

    private static OrderTrackingDto MapOrderTracking(Order o, string? estimatedMinutes) => new(
        o.Id,
        o.Status.ToString().ToLower(),
        o.Items.Select(i => new OrderTrackingItemDto(
            i.ProductName,
            i.Quantity,
            i.UnitPrice,
            i.Modifiers.Select(m => new OrderTrackingModifierDto(m.OptionName, m.ExtraPrice)).ToList(),
            i.Observations
        )).ToList(),
        o.TotalPrice,
        o.DeliveryMode,
        o.Address,
        estimatedMinutes,
        o.CustomerName,
        MaskPhone(o.CustomerPhone),
        o.CreatedAt,
        o.ConfirmedAt
    );

    // Enmascara el teléfono dejando visibles solo los últimos 4 dígitos, ej: "**1234".
    private static string MaskPhone(string phone) =>
        phone.Length >= 4 ? $"**{phone[^4..]}" : "**";

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
                    ? (decimal?)CalculateFinalPrice(prod.Price, prod.DiscountPercent)
                    : null;
                return new ProductDto(
                    prod.Id, prod.Name, prod.Description, prod.Price, finalPrice, prod.DiscountPercent, prod.Emoji, prod.ImageUrls, prod.Tags, prod.IsOutOfStock,
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

    // Prefijo usado por el frontend para distinguir promociones dentro del carrito (ver PromoModal.tsx).
    private const string PromoIdPrefix = "promo:";

    // POST /api/store/{slug}/orders
    // Crea un nuevo pedido para el tenant identificado por slug.
    // No requiere autenticación — endpoint público para clientes.
    [HttpPost("{slug}/orders")]
    [EnableRateLimiting("store")]
    public async Task<ActionResult<CreateOrderResponse>> CreateOrder(string slug, [FromBody] CreateOrderRequest req, CancellationToken ct = default)
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

        if (req.Items.Any(i => i.Quantity <= 0))
            return BadRequest(new { message = "La cantidad de un item debe ser mayor a 0." });

        // 2. Buscar tenant por slug (con DeliveryConfig y BusinessHours para validar cierre y envío)
        var tenant = await db.Tenants
            .Include(t => t.DeliveryConfig)
            .Include(t => t.BusinessHours)
            .FirstOrDefaultAsync(t => t.Slug == slug && t.Status != TenantStatus.Suspended, ct);

        if (tenant is null)
            return NotFound(new { message = "Tienda no encontrada." });

        if (tenant.Status == TenantStatus.Inactive)
            return StatusCode(403, new { message = "Esta tienda no está disponible en este momento." });

        // 2a. Bloqueo si el local está pausado manualmente por el admin (independiente del horario).
        if (tenant.IsPaused)
        {
            return StatusCode(409, new
            {
                message = "El local está pausado en este momento.",
                code = "STORE_CLOSED",
                isOpen = false
            });
        }

        // 2b. Bloqueo si el local está cerrado. Si no hay horarios configurados, se considera "siempre abierto".
        if (tenant.BusinessHours.Count > 0 && !IsCurrentlyOpen(tenant.BusinessHours))
        {
            return StatusCode(409, new
            {
                message = "El local está cerrado en este momento.",
                code = "STORE_CLOSED",
                isOpen = false
            });
        }

        // 3. Normalizar teléfono (solo dígitos)
        var normalizedPhone = string.Concat(req.CustomerPhone.Where(char.IsDigit));

        // 4. Separar items en productos normales y promociones ("promo:<id>")
        var productItemRequests = req.Items
            .Where(i => i.ProductId is null || !i.ProductId.StartsWith(PromoIdPrefix, StringComparison.Ordinal))
            .ToList();
        var promoItemRequests = req.Items
            .Where(i => i.ProductId is not null && i.ProductId.StartsWith(PromoIdPrefix, StringComparison.Ordinal))
            .ToList();

        var productIds = productItemRequests
            .Select(i => i.ProductId)
            .Where(id => id is not null)
            .Distinct()
            .ToList();
        var promoIds = promoItemRequests
            .Select(i => i.ProductId!.Substring(PromoIdPrefix.Length))
            .Distinct()
            .ToList();

        var products = await db.Products
            .Where(p => p.TenantId == tenant.Id && productIds.Contains(p.Id))
            .Include(p => p.ModifierGroups)
                .ThenInclude(g => g.Options)
            .ToListAsync(ct);

        var promotions = await db.Promotions
            .Where(p => p.TenantId == tenant.Id && promoIds.Contains(p.Id))
            .Include(p => p.ModifierGroups)
                .ThenInclude(g => g.Options)
            .ToListAsync(ct);

        // 5. Recalcular precios server-side (ignorando lo que mande el cliente)
        var orderItems = new List<OrderItem>();

        foreach (var i in productItemRequests)
        {
            var product = products.FirstOrDefault(p => p.Id == i.ProductId);
            if (product is null || !product.IsActive)
                return BadRequest(new { message = "Uno o más productos no están disponibles." });

            if (product.IsOutOfStock)
                return BadRequest(new { message = $"El producto '{product.Name}' está sin stock." });

            var (unitPrice, modifiers, error) = ResolveItemPricing(
                basePrice: CalculateFinalPrice(product.Price, product.DiscountPercent),
                availableOptions: product.ModifierGroups.SelectMany(g => g.Options),
                requestedModifiers: i.Modifiers);

            if (error is not null)
                return BadRequest(new { message = error });

            orderItems.Add(new OrderItem
            {
                ProductId = product.Id,
                ProductName = product.Name,
                Quantity = i.Quantity,
                UnitPrice = unitPrice,
                Modifiers = modifiers,
                Observations = string.IsNullOrWhiteSpace(i.Observations) ? null : i.Observations.Trim()
            });
        }

        foreach (var i in promoItemRequests)
        {
            var promoId = i.ProductId!.Substring(PromoIdPrefix.Length);
            var promo = promotions.FirstOrDefault(p => p.Id == promoId);
            if (promo is null || !promo.IsActive)
                return BadRequest(new { message = "Una o más promociones no están disponibles." });

            var (unitPrice, modifiers, error) = ResolveItemPricing(
                basePrice: promo.Price,
                availableOptions: promo.ModifierGroups.SelectMany(g => g.Options),
                requestedModifiers: i.Modifiers);

            if (error is not null)
                return BadRequest(new { message = error });

            orderItems.Add(new OrderItem
            {
                ProductId = i.ProductId!,
                ProductName = promo.Name,
                Quantity = i.Quantity,
                UnitPrice = unitPrice,
                Modifiers = modifiers,
                Observations = string.IsNullOrWhiteSpace(i.Observations) ? null : i.Observations.Trim()
            });
        }

        // 5b. Registrar redemptions de promociones de forma atómica con el pedido.
        // Se valida el límite por usuario (MaxPerUser) y se crea el PromoRedemption acá,
        // pero recién se persiste junto con el Order en el único SaveChangesAsync de más abajo.
        var promoQuantitiesById = promoItemRequests
            .GroupBy(i => i.ProductId!.Substring(PromoIdPrefix.Length))
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

        var subtotal = orderItems.Sum(oi => oi.UnitPrice * oi.Quantity);

        // 6. Costo de envío server-side
        decimal deliveryCost = 0;
        if (mode == "delivery" && tenant.DeliveryConfig is not null)
        {
            var cfg = tenant.DeliveryConfig;
            var freeFrom = cfg.FreeDeliveryFrom;
            deliveryCost = freeFrom.HasValue && subtotal >= freeFrom.Value
                ? 0
                : cfg.DeliveryCost ?? 0;
        }

        var totalPrice = subtotal + deliveryCost;

        // 7. Crear el pedido
        var order = new Order
        {
            Id            = Guid.NewGuid().ToString(),
            TenantId      = tenant.Id,
            CustomerName  = req.CustomerName.Trim(),
            CustomerPhone = normalizedPhone,
            Items         = orderItems,
            TotalPrice    = totalPrice,
            DeliveryMode  = mode,
            Address       = mode == "delivery" ? req.Address?.Trim() : null,
            Notes         = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            PaymentMethod = string.IsNullOrWhiteSpace(req.PaymentMethod) ? null : req.PaymentMethod.Trim().ToLowerInvariant(),
            Status        = OrderStatus.Pending,
            CreatedAt     = DateTime.UtcNow
        };

        // 8. Guardar todo (pedido + redemptions de promo) en una transacción, lockeando por
        // (tenant, promo, teléfono) antes de contar cuánto usó ya el cliente. Sin esto, dos
        // requests casi simultáneos del mismo teléfono pueden leer el mismo `used` y ambos
        // pasar la validación de MaxPerUser (condición de carrera, permite exceder el límite).
        // AcquireAdvisoryLockAsync es no-op fuera de Postgres (ver AppDbContext), así que en
        // los tests con EF InMemory este bloque se comporta exactamente igual que antes.
        await using var tx = await db.BeginTransactionAsync(ct);

        // Orden determinístico para no generar deadlocks si dos pedidos piden las mismas
        // promos en orden distinto.
        foreach (var promoId in promoQuantitiesById.Keys.OrderBy(id => id, StringComparer.Ordinal))
        {
            await db.AcquireAdvisoryLockAsync($"promo-redemption:{tenant.Id}:{promoId}:{normalizedPhone}", ct);
        }

        foreach (var (promoId, qtyPedida) in promoQuantitiesById)
        {
            var promo = promotions.FirstOrDefault(p => p.Id == promoId);
            if (promo is null)
                continue;

            if (promo.MaxPerUser.HasValue)
            {
                var used = await db.PromoRedemptions
                    .Where(r => r.PromotionId == promoId && r.PhoneNumber == normalizedPhone)
                    .SumAsync(r => r.Quantity, ct);

                if (used + qtyPedida > promo.MaxPerUser.Value)
                {
                    await tx.RollbackAsync(ct);
                    return StatusCode(409, new
                    {
                        message = "Ya alcanzaste el límite de esta promoción.",
                        code = "PROMO_LIMIT_REACHED",
                        promoId = promoId,
                        used = used,
                        maxPerUser = promo.MaxPerUser.Value
                    });
                }
            }

            db.PromoRedemptions.Add(new PromoRedemption
            {
                Id = Guid.NewGuid().ToString(),
                PromotionId = promoId,
                TenantId = tenant.Id,
                PhoneNumber = normalizedPhone,
                Quantity = qtyPedida,
                CreatedAt = DateTime.UtcNow
            });
        }

        try
        {
            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            // Emitir evento WebSocket
            await wsManager.BroadcastToTenantAsync(tenant.Id, new MorfApp.Api.WebSocket.WebSocketEvent
            {
                Type = "new_order",
                Data = new { orderId = order.Id, customerName = order.CustomerName, totalPrice = order.TotalPrice }
            });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            logger.LogError(ex, "Error al guardar pedido para tenant {TenantId}", tenant.Id);
            return StatusCode(500, new { message = "Error al guardar el pedido. Intente nuevamente." });
        }

        return Ok(new CreateOrderResponse(order.Id, true, tenant.WhatsappNumber, tenant.WhatsAppMessageTemplate));
    }

    // Valida los modificadores pedidos contra las opciones reales del producto/promo y calcula
    // el precio unitario final (precio base con descuento + suma de extras tomados de la DB).
    private static (decimal UnitPrice, List<OrderItemModifier> Modifiers, string? Error) ResolveItemPricing(
        decimal basePrice,
        IEnumerable<ModifierOption> availableOptions,
        List<CreateOrderItemModifierRequest>? requestedModifiers)
    {
        var modifiers = new List<OrderItemModifier>();
        decimal extras = 0;

        if (requestedModifiers is { Count: > 0 })
        {
            var optionsById = availableOptions.ToDictionary(o => o.Id);
            foreach (var m in requestedModifiers)
            {
                if (string.IsNullOrEmpty(m.OptionId) || !optionsById.TryGetValue(m.OptionId, out var option))
                    return (0, modifiers, "Una opción de personalización no es válida.");

                extras += option.ExtraPrice;
                modifiers.Add(new OrderItemModifier
                {
                    OptionId = option.Id,
                    OptionName = option.Name,
                    ExtraPrice = option.ExtraPrice
                });
            }
        }

        return (basePrice + extras, modifiers, null);
    }

    // Fórmula única de precio con descuento, compartida por GetMenu, MapPromotionPublic y CreateOrder.
    private static decimal CalculateFinalPrice(decimal price, int? discountPercent) =>
        discountPercent is > 0
            ? Math.Round(price * (1 - discountPercent.Value / 100m), 0)
            : price;

    internal static bool IsCurrentlyOpen(ICollection<Domain.Entities.BusinessHour> hours)
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        return IsCurrentlyOpen(hours, nowLocal);
    }

    // Overload testeable: acepta la hora local ya calculada, sin depender de TimeZoneInfo/DateTime.UtcNow.
    internal static bool IsCurrentlyOpen(ICollection<Domain.Entities.BusinessHour> hours, DateTime nowLocal)
    {
        var today = (int)nowLocal.DayOfWeek;
        var hour = nowLocal.ToString("HH:mm");

        var todayHours = hours.FirstOrDefault(h => h.DayOfWeek == today);
        if (todayHours is null || !todayHours.IsOpen) return false;
        if (todayHours.OpensAt is null || todayHours.ClosesAt is null) return true;

        return string.Compare(hour, todayHours.OpensAt, StringComparison.Ordinal) >= 0 &&
               string.Compare(hour, todayHours.ClosesAt, StringComparison.Ordinal) < 0;
    }
}
