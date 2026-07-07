using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Store;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using MorfApp.Tests.Fakes;
using System.Text.Encodings.Web;
using System.Text.Json;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class StoreControllerTests : TestBase
{
    // JsonSerializer.Serialize por defecto escapa caracteres no-ASCII (á -> á),
    // así que para poder comparar mensajes con tildes en los asserts usamos un encoder
    // relajado en vez de comparar contra la forma escapada.
    private static readonly JsonSerializerOptions RelaxedJsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private StoreController CreateController(FakeWebSocketManager? wsManager = null) =>
        new StoreController(Db, wsManager ?? new FakeWebSocketManager(), NullLogger<StoreController>.Instance);

    // ── Helpers de horarios ──────────────────────────────────────────────────────
    // El controller calcula "ahora" en America/Argentina/Buenos_Aires. Para que los
    // tests de horarios sean deterministas (no flaky) sin importar cuándo se corran,
    // los BusinessHour se construyen relativos a la hora real del sistema en esa
    // timezone, con clamping a los límites del día (00:00/23:59) para no depender de
    // wraparound de medianoche (que el controller tampoco soporta).

    private static DateTime NowInStoreTimezone()
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
    }

    private async Task AddOpenNowBusinessHourAsync(string tenantId)
    {
        var now = NowInStoreTimezone();

        var open = now.AddHours(-1);
        if (open.Date != now.Date) open = now.Date; // clamp a 00:00

        var close = now.AddHours(1);
        if (close.Date != now.Date) close = now.Date.AddDays(1).AddMinutes(-1); // clamp a 23:59

        Db.BusinessHours.Add(new BusinessHour
        {
            TenantId  = tenantId,
            DayOfWeek = (int)now.DayOfWeek,
            IsOpen    = true,
            OpensAt   = open.ToString("HH:mm"),
            ClosesAt  = close.ToString("HH:mm"),
        });
        await Db.SaveChangesAsync();
    }

    private async Task AddOutsideHoursBusinessHourAsync(string tenantId)
    {
        var now = NowInStoreTimezone();

        // Ventana elegida para excluir siempre la hora actual, sin wraparound de medianoche.
        string opensAt, closesAt;
        if (now.Hour < 12)
        {
            opensAt = "13:00";
            closesAt = "23:59";
        }
        else
        {
            opensAt = "00:00";
            closesAt = "05:00";
        }

        Db.BusinessHours.Add(new BusinessHour
        {
            TenantId  = tenantId,
            DayOfWeek = (int)now.DayOfWeek,
            IsOpen    = true,
            OpensAt   = opensAt,
            ClosesAt  = closesAt,
        });
        await Db.SaveChangesAsync();
    }

    private async Task AddClosedTodayBusinessHourAsync(string tenantId)
    {
        var now = NowInStoreTimezone();
        Db.BusinessHours.Add(new BusinessHour
        {
            TenantId  = tenantId,
            DayOfWeek = (int)now.DayOfWeek,
            IsOpen    = false,
        });
        await Db.SaveChangesAsync();
    }

    // ── Helpers de modificadores ─────────────────────────────────────────────────

    private async Task<ModifierOption> AddModifierOptionToProductAsync(Product product, decimal extraPrice = 50m)
    {
        var group = new ModifierGroup { TenantId = product.TenantId, Name = "Extras", Type = ModifierType.Multiple };
        var option = new ModifierOption { GroupId = group.Id, Name = "Queso Extra", Emoji = "🧀", ExtraPrice = extraPrice };
        group.Options.Add(option);
        Db.ModifierGroups.Add(group);
        await Db.SaveChangesAsync();

        product.ModifierGroups.Add(group);
        await Db.SaveChangesAsync();

        return option;
    }

    private async Task<ModifierOption> AddModifierOptionToPromoAsync(Promotion promo, decimal extraPrice = 50m)
    {
        var group = new ModifierGroup { TenantId = promo.TenantId, Name = "Extras", Type = ModifierType.Multiple };
        var option = new ModifierOption { GroupId = group.Id, Name = "Queso Extra", Emoji = "🧀", ExtraPrice = extraPrice };
        group.Options.Add(option);
        Db.ModifierGroups.Add(group);
        await Db.SaveChangesAsync();

        promo.ModifierGroups.Add(group);
        await Db.SaveChangesAsync();

        return option;
    }

    // ── GetTenant ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTenant_ValidSlug_ReturnsTenantPublicData()
    {
        var tenant = await CreateTenantAsync(slug: "mi-tienda");
        Db.TenantBrandings.Add(new TenantBranding
        {
            TenantId     = tenant.Id,
            ColorPrimary = "#ff0000",
            ColorAccent  = "#00ff00",
            EmojiIcon    = "🍕",
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetTenant("mi-tienda");

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantPublicDto>(ok.Value);
        Assert.Equal("mi-tienda", dto.Slug);
        Assert.Equal("#ff0000", dto.Branding.ColorPrimary);
    }

    [Fact]
    public async Task GetTenant_NonExistentSlug_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetTenant("slug-que-no-existe");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetTenant_SuspendedTenant_ReturnsNotFound()
    {
        await CreateTenantAsync(slug: "suspendido", status: TenantStatus.Suspended);

        var ctrl   = CreateController();
        var result = await ctrl.GetTenant("suspendido");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetTenant_NoDeliveryConfig_ReturnsDefaultDeliveryConfig()
    {
        await CreateTenantAsync(slug: "sin-config");

        var ctrl   = CreateController();
        var result = await ctrl.GetTenant("sin-config");

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantPublicDto>(ok.Value);
        Assert.Equal("both", dto.DeliveryConfig.Mode);
    }

    [Fact]
    public async Task GetTenant_NoPaymentConfig_ReturnsAllTrue()
    {
        await CreateTenantAsync(slug: "sin-payment");

        var ctrl   = CreateController();
        var result = await ctrl.GetTenant("sin-payment");

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantPublicDto>(ok.Value);
        Assert.True(dto.PaymentConfig.DeliveryCash);
        Assert.True(dto.PaymentConfig.PickupCard);
    }

    // ── GetMenu ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMenu_ActiveTenant_FiltersInactiveCategoriesOut()
    {
        // EF InMemory no soporta filtros dentro de Include (.Where(p => p.IsActive)),
        // por eso verificamos solo el filtro de categorías inactivas (que sí es un Where de nivel raíz).
        var tenant = await CreateTenantAsync(slug: "menu-test");
        var catA   = await CreateCategoryAsync(tenant.Id, "Pizzas", isActive: true);
        var catB   = await CreateCategoryAsync(tenant.Id, "Oculta",  isActive: false);
        await CreateProductAsync(tenant.Id, catA.Id, "Muzzarella", 500m);
        await CreateProductAsync(tenant.Id, catB.Id, "Invisible",  100m);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetMenu("menu-test");

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<CategoryDto>>(ok.Value);
        // Solo la categoría activa debe aparecer
        Assert.Single(list);
        Assert.Equal("Pizzas", list[0].Name);
        // "Invisible" NO debe aparecer porque su categoría está inactiva
        Assert.DoesNotContain(list, c => c.Name == "Oculta");
    }

    [Fact]
    public async Task GetMenu_NonExistentSlug_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetMenu("no-existe");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetMenu_InactiveTenant_Returns403()
    {
        await CreateTenantAsync(slug: "inactivo", status: TenantStatus.Inactive);

        var ctrl   = CreateController();
        var result = await ctrl.GetMenu("inactivo");

        var statusResult = Assert.IsType<StatusCodeResult>(result.Result);
        Assert.Equal(403, statusResult.StatusCode);
    }

    [Fact]
    public async Task GetMenu_ProductWithDiscount_ReturnsCalculatedFinalPrice()
    {
        var tenant = await CreateTenantAsync(slug: "con-descuento");
        var cat    = await CreateCategoryAsync(tenant.Id);
        Db.Products.Add(new Product
        {
            TenantId        = tenant.Id,
            CategoryId      = cat.Id,
            Name            = "Con Descuento",
            Price           = 1000m,
            DiscountPercent = 20,
            IsActive        = true,
            Tags            = [],
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetMenu("con-descuento");

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<CategoryDto>>(ok.Value);
        var prod = list[0].Products[0];
        Assert.Equal(1000m, prod.Price);
        Assert.Equal(800m,  prod.FinalPrice); // 1000 * (1 - 0.20) = 800
        Assert.Equal(20,    prod.DiscountPercent);
    }

    // ── GetPromotions ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPromotions_ReturnsOnlyActivePromotions()
    {
        var tenant = await CreateTenantAsync(slug: "promos");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Producto", 500m);

        Db.Promotions.Add(new Promotion { TenantId = tenant.Id, Name = "Activa",   IsActive = true,  ProductIds = [prod.Id], Price = 400m });
        Db.Promotions.Add(new Promotion { TenantId = tenant.Id, Name = "Inactiva", IsActive = false, ProductIds = [prod.Id], Price = 400m });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetPromotions("promos");

        Assert.Single(result);
        Assert.Equal("Activa", result[0].Name);
    }

    [Fact]
    public async Task GetPromotions_NonExistentSlug_ReturnsEmptyList()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetPromotions("no-existe");

        Assert.Empty(result);
    }

    // T4 — GetPromotions ya no trae todo el catálogo del tenant, solo los productos
    // referenciados por ProductIds de las promociones activas (neededProductIds).

    [Fact]
    public async Task GetPromotions_OnlyIncludesProductsReferencedByThePromotion()
    {
        var tenant = await CreateTenantAsync(slug: "promos-subset");
        var cat    = await CreateCategoryAsync(tenant.Id);
        // Productos referenciados por la promo
        var prodA  = await CreateProductAsync(tenant.Id, cat.Id, "Hamburguesa", 500m);
        var prodB  = await CreateProductAsync(tenant.Id, cat.Id, "Papas",       300m);
        // Producto del mismo tenant que NO participa de ninguna promoción
        var prodC  = await CreateProductAsync(tenant.Id, cat.Id, "Gaseosa",     200m);

        Db.Promotions.Add(new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo Burger",
            IsActive   = true,
            ProductIds = [prodA.Id, prodB.Id],
            Price      = 700m,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetPromotions("promos-subset");

        var promo = Assert.Single(result);
        Assert.Equal(2, promo.Products.Count);
        var productIds = promo.Products.Select(p => p.Id).ToList();
        Assert.Contains(prodA.Id, productIds);
        Assert.Contains(prodB.Id, productIds);
        Assert.DoesNotContain(prodC.Id, productIds);

        var dtoA = promo.Products.First(p => p.Id == prodA.Id);
        var dtoB = promo.Products.First(p => p.Id == prodB.Id);
        Assert.Equal(500m, dtoA.Price);
        Assert.Equal(300m, dtoB.Price);
    }

    [Fact]
    public async Task GetPromotions_TenantExistsWithoutActivePromotions_ReturnsEmptyListWithoutQueryingProducts()
    {
        var tenant = await CreateTenantAsync(slug: "promos-empty");
        var cat    = await CreateCategoryAsync(tenant.Id);
        // Productos existen, pero no hay ninguna promoción activa que los referencie —
        // neededProductIds queda vacío y el código no debe explotar ni ejecutar la query de productos.
        await CreateProductAsync(tenant.Id, cat.Id, "Producto Suelto", 150m);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetPromotions("promos-empty");

        Assert.Empty(result);
    }

    // ── GetRedemptionStatus ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetRedemptionStatus_NoRedemptions_ReturnsZeroUsed()
    {
        var tenant = await CreateTenantAsync(slug: "status-test");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Promo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 80m,
            MaxPerUser = 3,
        };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetRedemptionStatus("status-test", promo.Id, "1155667788");

        var ok  = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<RedemptionStatusDto>(ok.Value);
        Assert.Equal(0, dto.Used);
        Assert.True(dto.CanRedeem);
    }

    [Fact]
    public async Task GetRedemptionStatus_AtLimit_ReturnsNotAllowed()
    {
        var tenant = await CreateTenantAsync(slug: "at-limit");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Promo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 80m,
            MaxPerUser = 2,
        };
        Db.Promotions.Add(promo);
        Db.PromoRedemptions.Add(new PromoRedemption
        {
            TenantId    = tenant.Id,
            PromotionId = promo.Id,
            PhoneNumber = "1122334455",
            Quantity    = 2,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetRedemptionStatus("at-limit", promo.Id, "1122334455");

        var ok  = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<RedemptionStatusDto>(ok.Value);
        Assert.Equal(2, dto.Used);
        Assert.False(dto.CanRedeem);
    }

    // ── CreateOrder ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateOrder_ValidDeliveryOrder_ReturnsOrderId()
    {
        var tenant = await CreateTenantAsync(slug: "order-test");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 800m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("order-test", new CreateOrderRequest
        {
            CustomerName  = "Juan Pérez",
            CustomerPhone = "1155667788",
            DeliveryMode  = "delivery",
            Address       = "Calle Falsa 123",
            PaymentMethod = "cash",
            Total         = 850m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1 }],
        });

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CreateOrderResponse>(ok.Value);
        Assert.True(dto.Success);
        Assert.False(string.IsNullOrWhiteSpace(dto.OrderId));
    }

    [Fact]
    public async Task CreateOrder_ValidPickupOrder_ReturnsOrderId()
    {
        var tenant = await CreateTenantAsync(slug: "pickup-test");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Empanadas", 250m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("pickup-test", new CreateOrderRequest
        {
            CustomerName  = "Ana García",
            CustomerPhone = "1144556677",
            DeliveryMode  = "pickup",
            PaymentMethod = "transfer",
            Total         = 500m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Empanadas", Quantity = 2 }],
        });

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CreateOrderResponse>(ok.Value);
        Assert.True(dto.Success);
    }

    [Fact]
    public async Task CreateOrder_EmptyItems_ReturnsBadRequest()
    {
        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("any-slug", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "123",
            DeliveryMode  = "pickup",
            Total         = 0m,
            Items         = [],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_NullItems_ReturnsBadRequest()
    {
        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("any-slug", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "123",
            DeliveryMode  = "pickup",
            Total         = 0m,
            Items         = null,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_EmptyCustomerName_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "empty-name");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("empty-name", new CreateOrderRequest
        {
            CustomerName  = "",
            CustomerPhone = "123",
            DeliveryMode  = "pickup",
            Total         = 100m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "X", Quantity = 1 }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_EmptyCustomerPhone_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "empty-phone");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("empty-phone", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "",
            DeliveryMode  = "pickup",
            Total         = 100m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "X", Quantity = 1 }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_InvalidDeliveryMode_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "invalid-mode");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("invalid-mode", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "123",
            DeliveryMode  = "teleportation",
            Total         = 100m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "X", Quantity = 1 }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_DeliveryModeWithoutAddress_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "no-address");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("no-address", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "123",
            DeliveryMode  = "delivery",
            Address       = null,
            Total         = 100m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "X", Quantity = 1 }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_NonExistentTenant_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("tienda-inexistente", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "123",
            DeliveryMode  = "pickup",
            Total         = 100m,
            Items         = [new CreateOrderItemRequest { ProductId = "p1", ProductName = "X", Quantity = 1 }],
        });

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_SuspendedTenant_ReturnsNotFound()
    {
        await CreateTenantAsync(slug: "suspendido-order", status: TenantStatus.Suspended);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("suspendido-order", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "123",
            DeliveryMode  = "pickup",
            Total         = 100m,
            Items         = [new CreateOrderItemRequest { ProductId = "p1", ProductName = "X", Quantity = 1 }],
        });

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_PhoneNormalization_StoresOnlyDigits()
    {
        var tenant = await CreateTenantAsync(slug: "phone-norm");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id);

        var ctrl = CreateController();
        await ctrl.CreateOrder("phone-norm", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "+54 11-5566-7788",
            DeliveryMode  = "pickup",
            Total         = 100m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "X", Quantity = 1 }],
        });

        var order = Db.Orders.First(o => o.TenantId == tenant.Id);
        Assert.All(order.CustomerPhone, c => Assert.True(char.IsDigit(c)));
    }

    [Fact]
    public async Task CreateOrder_ClientSendsManipulatedTotal_RecalculatesServerSide()
    {
        var tenant = await CreateTenantAsync(slug: "manipulated-total");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 800m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("manipulated-total", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 1m, // manipulado: absurdamente bajo comparado con el precio real
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1, Price = 1m }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal(800m, order!.TotalPrice); // recalculado server-side, ignora el Total manipulado
    }

    [Fact]
    public async Task CreateOrder_ProductFromOtherTenant_ReturnsBadRequest()
    {
        var tenant      = await CreateTenantAsync(slug: "tenant-a");
        var otherTenant = await CreateTenantAsync(id: Guid.NewGuid().ToString(), slug: "tenant-b");
        var otherCat    = await CreateCategoryAsync(otherTenant.Id);
        var otherProd   = await CreateProductAsync(otherTenant.Id, otherCat.Id, "Producto Ajeno", 500m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("tenant-a", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 500m,
            Items         = [new CreateOrderItemRequest { ProductId = otherProd.Id, ProductName = "Producto Ajeno", Quantity = 1 }],
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = JsonSerializer.Serialize(bad.Value, RelaxedJsonOptions);
        Assert.Contains("no están disponibles", json);
    }

    [Fact]
    public async Task CreateOrder_ProductDoesNotExist_ReturnsBadRequest()
    {
        await CreateTenantAsync(slug: "no-product");

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("no-product", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 500m,
            Items         = [new CreateOrderItemRequest { ProductId = "nonexistent-id", ProductName = "X", Quantity = 1 }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_InactiveProduct_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "inactive-product");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Descontinuado", 300m);
        prod.IsActive = false;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("inactive-product", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 300m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Descontinuado", Quantity = 1 }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_AppliesProductDiscount_UsesDiscountedPriceNotRawPrice()
    {
        var tenant = await CreateTenantAsync(slug: "discount-order");
        var cat    = await CreateCategoryAsync(tenant.Id);
        Db.Products.Add(new Product
        {
            TenantId        = tenant.Id,
            CategoryId      = cat.Id,
            Name            = "Con Descuento",
            Price           = 1000m,
            DiscountPercent = 20,
            IsActive        = true,
            Tags            = [],
        });
        await Db.SaveChangesAsync();
        var prod = Db.Products.First(p => p.TenantId == tenant.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("discount-order", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 1000m, // el cliente manda el precio SIN descuento
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Con Descuento", Quantity = 1, Price = 1000m }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal(800m, order!.Items[0].UnitPrice); // 1000 * (1 - 0.20)
        Assert.Equal(800m, order.TotalPrice);
    }

    [Fact]
    public async Task CreateOrder_ValidModifierOption_UsesExtraPriceFromDb_IgnoresClientExtraPrice()
    {
        var tenant = await CreateTenantAsync(slug: "modifier-order");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 800m);
        var option = await AddModifierOptionToProductAsync(prod, extraPrice: 50m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("modifier-order", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 850m,
            Items = [new CreateOrderItemRequest
            {
                ProductId   = prod.Id,
                ProductName = "Pizza",
                Quantity    = 1,
                ExtraPrice  = 99999m, // manipulado por el cliente — debe ignorarse
                Modifiers   = [new CreateOrderItemModifierRequest { OptionId = option.Id }],
            }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal(850m, order!.Items[0].UnitPrice); // 800 (base) + 50 (extra real de la DB)
    }

    [Fact]
    public async Task CreateOrder_InvalidModifierOptionId_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "invalid-modifier");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 800m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("invalid-modifier", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 850m,
            Items = [new CreateOrderItemRequest
            {
                ProductId   = prod.Id,
                ProductName = "Pizza",
                Quantity    = 1,
                Modifiers   = [new CreateOrderItemModifierRequest { OptionId = "nonexistent-option" }],
            }],
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = JsonSerializer.Serialize(bad.Value, RelaxedJsonOptions);
        Assert.Contains("personalización no es válida", json);
    }

    [Fact]
    public async Task CreateOrder_PromoItem_UsesPromoPriceFromDb()
    {
        var tenant = await CreateTenantAsync(slug: "promo-order");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 500m);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 400m,
        };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("promo-order", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 400m,
            Items = [new CreateOrderItemRequest
            {
                ProductId   = $"promo:{promo.Id}",
                ProductName = "Combo",
                Quantity    = 1,
            }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal(400m, order!.Items[0].UnitPrice);
        Assert.Equal(400m, order.TotalPrice);
    }

    [Fact]
    public async Task CreateOrder_PromoItemWithModifier_UsesExtraPriceFromDb()
    {
        var tenant = await CreateTenantAsync(slug: "promo-modifier-order");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 500m);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 400m,
        };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();
        var option = await AddModifierOptionToPromoAsync(promo, extraPrice: 30m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("promo-modifier-order", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 430m,
            Items = [new CreateOrderItemRequest
            {
                ProductId   = $"promo:{promo.Id}",
                ProductName = "Combo",
                Quantity    = 1,
                Modifiers   = [new CreateOrderItemModifierRequest { OptionId = option.Id }],
            }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal(430m, order!.Items[0].UnitPrice); // 400 (promo) + 30 (extra real de la DB)
    }

    [Fact]
    public async Task CreateOrder_PromoFromOtherTenantOrInactive_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "promo-inactive");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 500m);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo Inactivo",
            IsActive   = false,
            ProductIds = [prod.Id],
            Price      = 400m,
        };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("promo-inactive", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 400m,
            Items         = [new CreateOrderItemRequest { ProductId = $"promo:{promo.Id}", ProductName = "Combo", Quantity = 1 }],
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = JsonSerializer.Serialize(bad.Value, RelaxedJsonOptions);
        Assert.Contains("promociones no están disponibles", json);
    }

    [Fact]
    public async Task CreateOrder_PromoWithinLimit_CreatesRedemptionRecordAtomicallyWithOrder()
    {
        var tenant = await CreateTenantAsync(slug: "promo-within-limit");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 500m);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 400m,
            MaxPerUser = 3,
        };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("promo-within-limit", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 400m,
            Items         = [new CreateOrderItemRequest { ProductId = $"promo:{promo.Id}", ProductName = "Combo", Quantity = 1 }],
        });

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CreateOrderResponse>(ok.Value);
        Assert.True(dto.Success);

        var redemption = Assert.Single(Db.PromoRedemptions.Where(r => r.PromotionId == promo.Id));
        Assert.Equal(1, redemption.Quantity);
        Assert.Equal("1122334455", redemption.PhoneNumber);

        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.NotNull(order);
    }

    [Fact]
    public async Task CreateOrder_PromoExceedsMaxPerUser_Returns409_NoRedemptionOrOrderCreated()
    {
        var tenant = await CreateTenantAsync(slug: "promo-exceeds-limit");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 500m);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 400m,
            MaxPerUser = 2,
        };
        Db.Promotions.Add(promo);
        Db.PromoRedemptions.Add(new PromoRedemption
        {
            TenantId    = tenant.Id,
            PromotionId = promo.Id,
            PhoneNumber = "1122334455",
            Quantity    = 2,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("promo-exceeds-limit", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "11-2233-4455", // normaliza a "1122334455", igual que la redemption previa
            DeliveryMode  = "pickup",
            Total         = 400m,
            Items         = [new CreateOrderItemRequest { ProductId = $"promo:{promo.Id}", ProductName = "Combo", Quantity = 1 }],
        });

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(409, status.StatusCode);

        var json = JsonSerializer.Serialize(status.Value);
        var doc  = JsonDocument.Parse(json).RootElement;
        Assert.Equal("PROMO_LIMIT_REACHED", doc.GetProperty("code").GetString());

        Assert.Single(Db.PromoRedemptions.Where(r => r.PromotionId == promo.Id));
        Assert.Equal(0, Db.Orders.Count(o => o.TenantId == tenant.Id));
    }

    [Fact]
    public async Task CreateOrder_MultiplePromoLinesSamePromo_AggregatesQuantityForLimitCheck()
    {
        var tenant = await CreateTenantAsync(slug: "promo-aggregate");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 500m);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 400m,
            MaxPerUser = 3,
        };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("promo-aggregate", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 1600m,
            Items =
            [
                new CreateOrderItemRequest { ProductId = $"promo:{promo.Id}", ProductName = "Combo", Quantity = 2 },
                new CreateOrderItemRequest { ProductId = $"promo:{promo.Id}", ProductName = "Combo", Quantity = 2 },
            ],
        });

        // Cada línea por separado (2) no supera el límite de 3, pero agregadas (2+2=4) sí lo superan.
        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(409, status.StatusCode);

        var json = JsonSerializer.Serialize(status.Value);
        var doc  = JsonDocument.Parse(json).RootElement;
        Assert.Equal("PROMO_LIMIT_REACHED", doc.GetProperty("code").GetString());
        Assert.Equal(0, doc.GetProperty("used").GetInt32());

        Assert.Empty(Db.PromoRedemptions.Where(r => r.PromotionId == promo.Id));
        Assert.Equal(0, Db.Orders.Count(o => o.TenantId == tenant.Id));
    }

    [Fact]
    public async Task CreateOrder_MultiplePromoLinesSamePromo_WithinLimit_CreatesSingleAggregatedRedemption()
    {
        var tenant = await CreateTenantAsync(slug: "promo-aggregate-ok");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 500m);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 400m,
            MaxPerUser = 3,
        };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("promo-aggregate-ok", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 800m,
            Items =
            [
                new CreateOrderItemRequest { ProductId = $"promo:{promo.Id}", ProductName = "Combo", Quantity = 1 },
                new CreateOrderItemRequest { ProductId = $"promo:{promo.Id}", ProductName = "Combo", Quantity = 1 },
            ],
        });

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CreateOrderResponse>(ok.Value);
        Assert.True(dto.Success);

        // Ambas líneas de la misma promo se agregan en UNA sola fila de PromoRedemption, con Quantity sumada.
        var redemption = Assert.Single(Db.PromoRedemptions.Where(r => r.PromotionId == promo.Id));
        Assert.Equal(2, redemption.Quantity);
    }

    [Fact]
    public async Task CreateOrder_DeliveryMode_AddsDeliveryCostFromConfig()
    {
        var tenant = await CreateTenantAsync(slug: "delivery-cost");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 300m);
        Db.DeliveryConfigs.Add(new DeliveryConfig
        {
            TenantId         = tenant.Id,
            Mode             = DeliveryMode.Both,
            DeliveryCost     = 150m,
            FreeDeliveryFrom = 1000m,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("delivery-cost", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "delivery",
            Address       = "Calle 123",
            Total         = 300m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1 }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal(450m, order!.TotalPrice); // 300 (subtotal) + 150 (envío, subtotal < freeFrom)
    }

    [Fact]
    public async Task CreateOrder_SubtotalAboveFreeDeliveryThreshold_NoDeliveryCostAdded()
    {
        var tenant = await CreateTenantAsync(slug: "free-delivery");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 1200m);
        Db.DeliveryConfigs.Add(new DeliveryConfig
        {
            TenantId         = tenant.Id,
            Mode             = DeliveryMode.Both,
            DeliveryCost     = 150m,
            FreeDeliveryFrom = 1000m,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("free-delivery", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "delivery",
            Address       = "Calle 123",
            Total         = 1200m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1 }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal(1200m, order!.TotalPrice); // sin costo de envío, subtotal >= freeFrom
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CreateOrder_ZeroOrNegativeQuantity_ReturnsBadRequest(int quantity)
    {
        var slug   = $"qty-test-{Guid.NewGuid()}";
        var tenant = await CreateTenantAsync(slug: slug);
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 300m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder(slug, new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 300m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = quantity }],
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_StoreClosedToday_Returns409()
    {
        var tenant = await CreateTenantAsync(slug: "closed-today");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 300m);
        await AddClosedTodayBusinessHourAsync(tenant.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("closed-today", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 300m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1 }],
        });

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(409, status.StatusCode);

        var json = JsonSerializer.Serialize(status.Value);
        var doc  = JsonDocument.Parse(json).RootElement;
        Assert.Equal("El local está cerrado en este momento.", doc.GetProperty("message").GetString());
        Assert.Equal("STORE_CLOSED", doc.GetProperty("code").GetString());
        Assert.False(doc.GetProperty("isOpen").GetBoolean());
    }

    [Fact]
    public async Task CreateOrder_StoreOpenButOutsideHours_Returns409()
    {
        var tenant = await CreateTenantAsync(slug: "outside-hours");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 300m);
        await AddOutsideHoursBusinessHourAsync(tenant.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("outside-hours", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 300m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1 }],
        });

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(409, status.StatusCode);
    }

    [Fact]
    public async Task CreateOrder_TenantWithoutAnyBusinessHours_TreatsAsOpen_DoesNotReturn409()
    {
        var tenant = await CreateTenantAsync(slug: "no-hours-configured");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 300m);
        // Sin BusinessHours configurados -> se trata como "siempre abierto"

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("no-hours-configured", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 300m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1 }],
        });

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrder_StoreOpen_ProceedsNormally()
    {
        var tenant = await CreateTenantAsync(slug: "store-open");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 300m);
        await AddOpenNowBusinessHourAsync(tenant.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("store-open", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 300m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1 }],
        });

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CreateOrderResponse>(ok.Value);
        Assert.True(dto.Success);
    }

    [Fact]
    public async Task CreateOrder_ProductOutOfStock_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "out-of-stock");
        var cat    = await CreateCategoryAsync(tenant.Id);
        Db.Products.Add(new Product
        {
            TenantId      = tenant.Id,
            CategoryId    = cat.Id,
            Name          = "Sin Stock",
            Price         = 500m,
            IsActive      = true,
            IsOutOfStock  = true,
            Tags          = [],
        });
        await Db.SaveChangesAsync();
        var prod = Db.Products.First(p => p.TenantId == tenant.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("out-of-stock", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 500m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Sin Stock", Quantity = 1 }],
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = JsonSerializer.Serialize(bad.Value, RelaxedJsonOptions);
        Assert.Contains("está sin stock", json);
        Assert.Contains("Sin Stock", json);
    }

    [Fact]
    public async Task CreateOrder_ProductWithObservations_PersistsObservationsOnOrderItem()
    {
        var tenant = await CreateTenantAsync(slug: "with-observations");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 800m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("with-observations", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 800m,
            Items = [new CreateOrderItemRequest
            {
                ProductId    = prod.Id,
                ProductName  = "Pizza",
                Quantity     = 1,
                Observations = "  Sin cebolla, por favor  ",
            }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal("Sin cebolla, por favor", order!.Items[0].Observations); // trimeado
    }

    [Fact]
    public async Task CreateOrder_ObservationsBlank_StoresNullNotEmptyString()
    {
        var tenant = await CreateTenantAsync(slug: "blank-observations");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 800m);

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("blank-observations", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 800m,
            Items = [new CreateOrderItemRequest
            {
                ProductId    = prod.Id,
                ProductName  = "Pizza",
                Quantity     = 1,
                Observations = "   ",
            }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Null(order!.Items[0].Observations);
    }

    [Fact]
    public async Task CreateOrder_PromoItemWithObservations_PersistsObservationsOnOrderItem()
    {
        var tenant = await CreateTenantAsync(slug: "promo-observations");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 500m);
        var promo  = new Promotion
        {
            TenantId   = tenant.Id,
            Name       = "Combo",
            IsActive   = true,
            ProductIds = [prod.Id],
            Price      = 400m,
        };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("promo-observations", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 400m,
            Items = [new CreateOrderItemRequest
            {
                ProductId    = $"promo:{promo.Id}",
                ProductName  = "Combo",
                Quantity     = 1,
                Observations = "Sin ketchup",
            }],
        });

        var ok    = Assert.IsType<OkObjectResult>(result.Result);
        var dto   = Assert.IsType<CreateOrderResponse>(ok.Value);
        var order = await Db.Orders.FindAsync(dto.OrderId);
        Assert.Equal("Sin ketchup", order!.Items[0].Observations);
    }

    // ── GetOrderTracking (C1 — tracking público del pedido) ─────────────────────────

    [Fact]
    public async Task GetOrderTracking_ExistingOrderOfOwnerTenant_ReturnsDtoWithMaskedPhone()
    {
        var tenant = await CreateTenantAsync(slug: "tracking-ok");
        var order  = await CreateOrderAsync(tenant.Id);

        var ctrl   = CreateController();
        var result = await ctrl.GetOrderTracking("tracking-ok", order.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderTrackingDto>(ok.Value);
        Assert.Equal(order.Id, dto.Id);
        // El teléfono de prueba de TestBase.CreateOrderAsync es "1234567890" -> enmascarado "**7890"
        Assert.DoesNotContain(order.CustomerPhone, dto.CustomerPhoneMasked);
        Assert.EndsWith(order.CustomerPhone[^4..], dto.CustomerPhoneMasked);
        Assert.Equal("**7890", dto.CustomerPhoneMasked);
    }

    [Fact]
    public async Task GetOrderTracking_OrderBelongsToOtherTenant_ReturnsNotFound()
    {
        var ownerTenant = await CreateTenantAsync(slug: "tracking-owner");
        var otherTenant = await CreateTenantAsync(id: Guid.NewGuid().ToString(), slug: "tracking-other");
        var order       = await CreateOrderAsync(ownerTenant.Id);

        var ctrl   = CreateController();
        // Buscamos el pedido del tenant dueño usando el slug de un tenant distinto
        var result = await ctrl.GetOrderTracking("tracking-other", order.Id);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetOrderTracking_NonExistentOrderId_ReturnsNotFound()
    {
        var tenant = await CreateTenantAsync(slug: "tracking-noorder");

        var ctrl   = CreateController();
        var result = await ctrl.GetOrderTracking("tracking-noorder", Guid.NewGuid().ToString());

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetOrderTracking_NonExistentSlug_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetOrderTracking("slug-que-no-existe", Guid.NewGuid().ToString());

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ── Pausar tienda (A2) ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateOrder_TenantPaused_Returns409StoreClosed()
    {
        var tenant = await CreateTenantAsync(slug: "paused-store");
        var cat    = await CreateCategoryAsync(tenant.Id);
        var prod   = await CreateProductAsync(tenant.Id, cat.Id, "Pizza", 300m);

        var trackedTenant = await Db.Tenants.FindAsync(tenant.Id);
        trackedTenant!.IsPaused = true;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateOrder("paused-store", new CreateOrderRequest
        {
            CustomerName  = "Cliente",
            CustomerPhone = "1122334455",
            DeliveryMode  = "pickup",
            Total         = 300m,
            Items         = [new CreateOrderItemRequest { ProductId = prod.Id, ProductName = "Pizza", Quantity = 1 }],
        });

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(409, status.StatusCode);

        var json = JsonSerializer.Serialize(status.Value);
        var doc  = JsonDocument.Parse(json).RootElement;
        Assert.Equal("STORE_CLOSED", doc.GetProperty("code").GetString());
        Assert.False(doc.GetProperty("isOpen").GetBoolean());
    }

    [Fact]
    public async Task GetTenant_TenantPaused_IsOpenFalseDespiteOpenBusinessHours()
    {
        var tenant = await CreateTenantAsync(slug: "paused-gettenant");
        await AddOpenNowBusinessHourAsync(tenant.Id);

        var trackedTenant = await Db.Tenants.FindAsync(tenant.Id);
        trackedTenant!.IsPaused = true;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetTenant("paused-gettenant");

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantPublicDto>(ok.Value);
        Assert.False(dto.IsOpen);
    }
}
