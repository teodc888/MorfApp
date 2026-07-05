using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class AdminControllerTests : TestBase
{
    private AdminController CreateController(string? tenantId = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:PublicUrl"]    = "http://localhost:5500",
                ["App:UploadsPath"] = Path.GetTempPath(),
            })
            .Build();

        var env  = new Mock<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
        env.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());

        var ctrl = new AdminController(Db, config, env.Object);
        SetupTenantClaims(ctrl, tenantId ?? TenantId);
        return ctrl;
    }

    // ── GetMe ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMe_TenantExists_ReturnsTenantInfo()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.GetMe();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantInfoDto>(ok.Value);
        Assert.Equal(TenantId, dto.Id);
        Assert.Equal("Test Tenant", dto.Name);
    }

    [Fact]
    public async Task GetMe_TenantNotFound_ReturnsNotFound()
    {
        // No creamos el tenant en DB
        var ctrl   = CreateController();
        var result = await ctrl.GetMe();

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetMe_TenantWithFutureSubscription_ReturnsPositiveDaysRemaining()
    {
        var tenant = await CreateTenantAsync();
        tenant.SubscriptionEndsAt = DateTime.UtcNow.AddDays(10);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetMe();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantInfoDto>(ok.Value);
        Assert.NotNull(dto.SubscriptionDaysRemaining);
        Assert.True(dto.SubscriptionDaysRemaining >= 9 && dto.SubscriptionDaysRemaining <= 10);
    }

    [Fact]
    public async Task GetMe_TenantWithPastSubscription_ReturnsNegativeDaysRemaining()
    {
        var tenant = await CreateTenantAsync();
        tenant.SubscriptionEndsAt = DateTime.UtcNow.AddDays(-5);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetMe();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantInfoDto>(ok.Value);
        Assert.NotNull(dto.SubscriptionDaysRemaining);
        // El mapper usa Math.Floor((SubscriptionEndsAt - UtcNow).TotalDays); dado que transcurre
        // un pequeño instante entre fijar SubscriptionEndsAt y llamar GetMe(), el resultado real
        // puede ser -6 (no -5) por el redondeo hacia abajo. Toleramos ambos.
        Assert.True(dto.SubscriptionDaysRemaining <= -4 && dto.SubscriptionDaysRemaining >= -6);
    }

    [Fact]
    public async Task GetMe_TenantWithoutSubscriptionEndsAt_ReturnsNull()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.GetMe();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantInfoDto>(ok.Value);
        Assert.Null(dto.SubscriptionDaysRemaining);
    }

    // ── UpdateMe ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateMe_ValidData_ReturnsNoContent()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.UpdateMe(new UpdateTenantRequest("Nuevo Nombre", "5491122334455"));

        Assert.IsType<NoContentResult>(result);

        var tenant = await Db.Tenants.FindAsync(TenantId);
        Assert.Equal("Nuevo Nombre", tenant!.Name);
        Assert.Equal("5491122334455", tenant.WhatsappNumber);
    }

    [Fact]
    public async Task UpdateMe_TenantNotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.UpdateMe(new UpdateTenantRequest("X", "123"));

        Assert.IsType<NotFoundResult>(result);
    }

    // ── UpdateBranding ──────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateBranding_NoBrandingExists_CreatesBranding()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.UpdateBranding(new UpdateBrandingRequest(
            "#ff0000", "#00ff00", null, null, "Bienvenidos", "🍕"));

        Assert.IsType<NoContentResult>(result);

        var branding = Db.TenantBrandings.FirstOrDefault(b => b.TenantId == TenantId);
        Assert.NotNull(branding);
        Assert.Equal("#ff0000", branding.ColorPrimary);
        Assert.Equal("🍕", branding.EmojiIcon);
    }

    [Fact]
    public async Task UpdateBranding_BrandingExists_UpdatesBranding()
    {
        await CreateTenantAsync();
        Db.TenantBrandings.Add(new TenantBranding
        {
            TenantId     = TenantId,
            ColorPrimary = "#000000",
            ColorAccent  = "#ffffff",
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.UpdateBranding(new UpdateBrandingRequest(
            "#aabbcc", "#112233", null, null, null, "🍔"));

        Assert.IsType<NoContentResult>(result);

        var branding = Db.TenantBrandings.First(b => b.TenantId == TenantId);
        Assert.Equal("#aabbcc", branding.ColorPrimary);
    }

    // ── UpdateDelivery ──────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateDelivery_ValidMode_ReturnsNoContent()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.UpdateDelivery(new UpdateDeliveryRequest(
            "Both", 500m, 2000m, 300m, "30-45 min", "Av. Siempreviva 742"));

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task UpdateDelivery_InvalidMode_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.UpdateDelivery(new UpdateDeliveryRequest(
            "TeleportMode", null, null, null, null, null));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateDelivery_NoDeliveryConfigExists_CreatesOne()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        await ctrl.UpdateDelivery(new UpdateDeliveryRequest("Delivery", 400m, null, 200m, "30 min", null));

        var config = Db.DeliveryConfigs.FirstOrDefault(d => d.TenantId == TenantId);
        Assert.NotNull(config);
        Assert.Equal(DeliveryMode.Delivery, config.Mode);
        Assert.Equal(400m, config.DeliveryCost);
    }

    // ── UpdateHours ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateHours_ValidHours_SavesCorrectly()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var hours  = new List<HourAdminDto>
        {
            new(1, true,  "09:00", "22:00"),
            new(2, true,  "09:00", "22:00"),
            new(0, false, null,    null),
        };
        var result = await ctrl.UpdateHours(new UpdateHoursRequest(hours));

        Assert.IsType<NoContentResult>(result);
        Assert.Equal(3, Db.BusinessHours.Count(h => h.TenantId == TenantId));
    }

    // ── UpdateWhatsAppTemplate ───────────────────────────────────────────────────

    [Fact]
    public async Task UpdateWhatsAppTemplate_ValidTemplate_SavesTemplate()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.UpdateWhatsAppTemplate(
            new UpdateWhatsAppTemplateRequest("Hola! Tu pedido #{id} está listo"));

        Assert.IsType<NoContentResult>(result);
        var tenant = await Db.Tenants.FindAsync(TenantId);
        Assert.Equal("Hola! Tu pedido #{id} está listo", tenant!.WhatsAppMessageTemplate);
    }

    // ── UpdatePayment ────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdatePayment_NoConfigExists_CreatesConfig()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.UpdatePayment(new UpdatePaymentRequest(true, true, false, true, false, true));

        Assert.IsType<NoContentResult>(result);
        var payment = Db.PaymentConfigs.FirstOrDefault(p => p.TenantId == TenantId);
        Assert.NotNull(payment);
        Assert.True(payment.DeliveryCash);
        Assert.False(payment.DeliveryCard);
    }

    // ── Categories ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetCategories_ReturnsTenantCategoriesOnly()
    {
        await CreateTenantAsync();
        await CreateCategoryAsync(TenantId, "Pizzas");
        await CreateCategoryAsync(TenantId, "Bebidas");
        await CreateCategoryAsync("other-tenant-id", "No debería aparecer");

        var ctrl   = CreateController();
        var result = await ctrl.GetCategories();

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<CategoryAdminDto>>(ok.Value);
        Assert.Equal(2, list.Count);
        Assert.All(list, c => Assert.NotEqual("No debería aparecer", c.Name));
    }

    [Fact]
    public async Task CreateCategory_ValidData_ReturnsCreatedCategory()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.CreateCategory(new CreateCategoryRequest("Empanadas", "🥟", 1));

        var created = Assert.IsType<CreatedResult>(result.Result);
        var dto     = Assert.IsType<CategoryAdminDto>(created.Value);
        Assert.Equal("Empanadas", dto.Name);
        Assert.Equal("🥟", dto.Emoji);
    }

    [Fact]
    public async Task UpdateCategory_Exists_ReturnsNoContent()
    {
        await CreateTenantAsync();
        var cat    = await CreateCategoryAsync(TenantId);
        var ctrl   = CreateController();
        var result = await ctrl.UpdateCategory(cat.Id, new UpdateCategoryRequest("Actualizada", "🍽️", 2, false));

        Assert.IsType<NoContentResult>(result);
        var updated = await Db.Categories.FindAsync(cat.Id);
        Assert.Equal("Actualizada", updated!.Name);
        Assert.False(updated.IsActive);
    }

    [Fact]
    public async Task UpdateCategory_BelongsToOtherTenant_ReturnsNotFound()
    {
        var otherTenantId = "other-tenant";
        await CreateCategoryAsync(otherTenantId, "Cat Ajena");
        var cat = Db.Categories.First(c => c.TenantId == otherTenantId);

        var ctrl   = CreateController(); // controller con TenantId propio
        var result = await ctrl.UpdateCategory(cat.Id, new UpdateCategoryRequest("Hack", null, 0, true));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task DeleteCategory_Exists_ReturnsNoContent()
    {
        await CreateTenantAsync();
        var cat    = await CreateCategoryAsync(TenantId);
        var ctrl   = CreateController();
        var result = await ctrl.DeleteCategory(cat.Id);

        Assert.IsType<NoContentResult>(result);
        Assert.Null(await Db.Categories.FindAsync(cat.Id));
    }

    [Fact]
    public async Task DeleteCategory_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.DeleteCategory("nonexistent-category-id");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── Products ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateProduct_ValidData_ReturnsCreatedProduct()
    {
        await CreateTenantAsync();
        var cat    = await CreateCategoryAsync(TenantId);
        var ctrl   = CreateController();
        var result = await ctrl.CreateProduct(new CreateProductRequest(
            cat.Id, "Milanesa", "Con papas fritas", 850m, "🥩", null, 0, true, false, []));

        var created = Assert.IsType<CreatedResult>(result.Result);
        var dto     = Assert.IsType<ProductAdminDto>(created.Value);
        Assert.Equal("Milanesa", dto.Name);
        Assert.Equal(850m, dto.Price);
    }

    [Fact]
    public async Task CreateProduct_CategoryBelongsToOtherTenant_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var otherCat = await CreateCategoryAsync("other-tenant-id", "Cat Ajena");

        var ctrl   = CreateController();
        var result = await ctrl.CreateProduct(new CreateProductRequest(
            otherCat.Id, "Producto", null, 100m, "🍔", null, 0, true, false, []));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateProduct_Exists_ReturnsNoContent()
    {
        await CreateTenantAsync();
        var cat     = await CreateCategoryAsync(TenantId);
        var product = await CreateProductAsync(TenantId, cat.Id, "Original", 100m);
        var ctrl    = CreateController();

        var result = await ctrl.UpdateProduct(product.Id, new UpdateProductRequest(
            cat.Id, "Actualizado", null, 200m, "🍕", null, 1, true, false, []));

        Assert.IsType<NoContentResult>(result);
        var updated = await Db.Products.FindAsync(product.Id);
        Assert.Equal("Actualizado", updated!.Name);
        Assert.Equal(200m, updated.Price);
    }

    [Fact]
    public async Task UpdateProduct_BelongsToOtherTenant_ReturnsNotFound()
    {
        var cat    = await CreateCategoryAsync("other-tenant-id");
        var prod   = await CreateProductAsync("other-tenant-id", cat.Id);
        var ctrl   = CreateController();
        var result = await ctrl.UpdateProduct(prod.Id, new UpdateProductRequest(
            cat.Id, "Hack", null, 1m, "🍕", null, 0, true, false, []));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateProductDiscount_ValidDiscount_UpdatesProduct()
    {
        await CreateTenantAsync();
        var cat     = await CreateCategoryAsync(TenantId);
        var product = await CreateProductAsync(TenantId, cat.Id);
        var ctrl    = CreateController();

        var result = await ctrl.UpdateProductDiscount(product.Id, new UpdateProductDiscountRequest(20));

        Assert.IsType<NoContentResult>(result);
        var updated = await Db.Products.FindAsync(product.Id);
        Assert.Equal(20, updated!.DiscountPercent);
    }

    [Fact]
    public async Task UpdateProductDiscount_ZeroDiscount_SetsNull()
    {
        await CreateTenantAsync();
        var cat     = await CreateCategoryAsync(TenantId);
        var product = await CreateProductAsync(TenantId, cat.Id);
        product.DiscountPercent = 15;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.UpdateProductDiscount(product.Id, new UpdateProductDiscountRequest(0));

        Assert.IsType<NoContentResult>(result);
        var updated = await Db.Products.FindAsync(product.Id);
        Assert.Null(updated!.DiscountPercent);
    }

    [Fact]
    public async Task DeleteProduct_Exists_ReturnsNoContent()
    {
        await CreateTenantAsync();
        var cat     = await CreateCategoryAsync(TenantId);
        var product = await CreateProductAsync(TenantId, cat.Id);
        var ctrl    = CreateController();

        var result = await ctrl.DeleteProduct(product.Id);

        Assert.IsType<NoContentResult>(result);
        Assert.Null(await Db.Products.FindAsync(product.Id));
    }

    [Fact]
    public async Task DeleteProduct_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.DeleteProduct("nonexistent-product-id");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── ModifierGroups ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetModifierGroups_ReturnsTenantGroupsOnly()
    {
        await CreateTenantAsync();
        Db.ModifierGroups.Add(new ModifierGroup { TenantId = TenantId,        Name = "Salsas", Type = ModifierType.Single });
        Db.ModifierGroups.Add(new ModifierGroup { TenantId = "other-tenant",  Name = "Ajeno",  Type = ModifierType.Single });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetModifierGroups();

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<ModifierGroupAdminDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal("Salsas", list[0].Name);
    }

    [Fact]
    public async Task CreateModifierGroup_ValidData_ReturnsCreated()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.CreateModifierGroup(new CreateModifierGroupRequest(
            "Tamaños", "Single", false, null, 0,
            [new(null, "Chico", "🔹", 0m, 0), new(null, "Grande", "🔷", 100m, 1)]));

        var created = Assert.IsType<CreatedResult>(result.Result);
        var dto     = Assert.IsType<ModifierGroupAdminDto>(created.Value);
        Assert.Equal("Tamaños", dto.Name);
        Assert.Equal(2, dto.Options.Count);
    }

    [Fact]
    public async Task CreateModifierGroup_InvalidType_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.CreateModifierGroup(new CreateModifierGroupRequest(
            "Test", "InvalidType", false, null, 0, []));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateModifierGroup_UpsertOptions_WorksCorrectly()
    {
        await CreateTenantAsync();
        var group = new ModifierGroup { TenantId = TenantId, Name = "Extras", Type = ModifierType.Multiple };
        var opt   = new ModifierOption { GroupId = group.Id, Name = "Queso Extra", Emoji = "🧀", ExtraPrice = 50m };
        group.Options.Add(opt);
        Db.ModifierGroups.Add(group);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        // Actualizar opción existente + agregar nueva
        var result = await ctrl.UpdateModifierGroup(group.Id, new UpdateModifierGroupRequest(
            "Extras Editado", "Multiple", false, null, 0,
            [
                new(opt.Id, "Queso Extra Editado", "🧀", 60m, 0),
                new(null,   "Jamón",                "🥩", 80m, 1),
            ]));

        Assert.IsType<NoContentResult>(result);
        var updatedGroup = Db.ModifierGroups.First(g => g.Id == group.Id);
        Assert.Equal("Extras Editado", updatedGroup.Name);
        Assert.Equal(2, Db.ModifierOptions.Count(o => o.GroupId == group.Id));
    }

    [Fact]
    public async Task UpdateModifierGroup_BelongsToOtherTenant_ReturnsNotFound()
    {
        var group = new ModifierGroup { TenantId = "other-tenant", Name = "Ajeno", Type = ModifierType.Single };
        Db.ModifierGroups.Add(group);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.UpdateModifierGroup(group.Id, new UpdateModifierGroupRequest(
            "Hack", "Single", false, null, 0, []));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task DeleteModifierGroup_Exists_ReturnsNoContent()
    {
        await CreateTenantAsync();
        var group = new ModifierGroup { TenantId = TenantId, Name = "Test", Type = ModifierType.Single };
        Db.ModifierGroups.Add(group);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.DeleteModifierGroup(group.Id);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeleteModifierGroup_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.DeleteModifierGroup("nonexistent-group");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── Promotions ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPromotions_ReturnsTenantPromotionsOnly()
    {
        await CreateTenantAsync();
        var cat  = await CreateCategoryAsync(TenantId);
        var prod = await CreateProductAsync(TenantId, cat.Id, "Producto", 200m);

        Db.Promotions.Add(new Promotion { TenantId = TenantId,       Name = "Promo Mía",  ProductIds = [prod.Id], Price = 180m });
        Db.Promotions.Add(new Promotion { TenantId = "other-tenant", Name = "Promo Ajena", ProductIds = [],       Price = 100m });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetPromotions();

        var list = Assert.IsType<List<PromotionAdminDto>>(result);
        Assert.Single(list);
        Assert.Equal("Promo Mía", list[0].Name);
    }

    // T4 — GetPromotions ya no trae todo el catálogo del tenant, solo los productos
    // referenciados por ProductIds de las promociones (neededProductIds).

    [Fact]
    public async Task GetPromotions_ComputesOriginalPriceFromOnlyReferencedProducts()
    {
        await CreateTenantAsync();
        var cat   = await CreateCategoryAsync(TenantId);
        var prodA = await CreateProductAsync(TenantId, cat.Id, "Hamburguesa", 500m);
        var prodB = await CreateProductAsync(TenantId, cat.Id, "Papas",       300m);
        // Producto del tenant que NO participa de la promoción — no debe afectar el cálculo.
        await CreateProductAsync(TenantId, cat.Id, "Gaseosa", 200m);

        Db.Promotions.Add(new Promotion
        {
            TenantId   = TenantId,
            Name       = "Combo Burger",
            ProductIds = [prodA.Id, prodB.Id],
            Price      = 640m,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetPromotions();

        var list = Assert.IsType<List<PromotionAdminDto>>(result);
        var promo = Assert.Single(list);
        Assert.Equal(800m, promo.OriginalPrice); // 500 + 300, sin contar la gaseosa
    }

    [Fact]
    public async Task GetPromotions_DuplicateProductIdsInSamePromotion_CountsPriceForEachOccurrence()
    {
        await CreateTenantAsync();
        var cat  = await CreateCategoryAsync(TenantId);
        var prod = await CreateProductAsync(TenantId, cat.Id, "Empanada", 100m);

        Db.Promotions.Add(new Promotion
        {
            TenantId   = TenantId,
            Name       = "Docena de Empanadas",
            ProductIds = [prod.Id, prod.Id], // mismo producto dos veces
            Price      = 180m,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetPromotions();

        var list  = Assert.IsType<List<PromotionAdminDto>>(result);
        var promo = Assert.Single(list);
        Assert.Equal(200m, promo.OriginalPrice); // 100 * 2, comportamiento preexistente
    }

    [Fact]
    public async Task CreatePromotion_ValidData_ReturnsCreated()
    {
        await CreateTenantAsync();
        var cat  = await CreateCategoryAsync(TenantId);
        var prod = await CreateProductAsync(TenantId, cat.Id, "Hamburgesa", 800m);

        var ctrl   = CreateController();
        var result = await ctrl.CreatePromotion(new CreatePromotionRequest(
            "Combo Familiar", null, 20m, "🍔", null, 0, true, null, [prod.Id], []));

        var created = Assert.IsType<CreatedResult>(result);
        var dto     = Assert.IsType<PromotionAdminDto>(created.Value);
        Assert.Equal("Combo Familiar", dto.Name);
        Assert.Equal(640m, dto.Price); // 800 * (1 - 0.20) = 640
    }

    [Fact]
    public async Task CreatePromotion_ProductFromOtherTenant_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var otherCat  = await CreateCategoryAsync("other-tenant");
        var otherProd = await CreateProductAsync("other-tenant", otherCat.Id);

        var ctrl   = CreateController();
        var result = await ctrl.CreatePromotion(new CreatePromotionRequest(
            "Hack", null, 10m, null, null, 0, true, null, [otherProd.Id], []));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeletePromotion_Exists_ReturnsNoContent()
    {
        await CreateTenantAsync();
        var promo = new Promotion { TenantId = TenantId, Name = "Promo", ProductIds = [], Price = 100m };
        Db.Promotions.Add(promo);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.DeletePromotion(promo.Id);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeletePromotion_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.DeletePromotion("nonexistent-promo");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── UpdatePlan ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdatePlan_ValidPlan_UpdatesPlan()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.UpdatePlan(new UpdatePlanRequest("Pro"));

        Assert.IsType<NoContentResult>(result);
        var tenant = await Db.Tenants.FindAsync(TenantId);
        Assert.Equal(TenantPlan.Pro, tenant!.Plan);
    }

    [Fact]
    public async Task UpdatePlan_InvalidPlan_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var ctrl   = CreateController();
        var result = await ctrl.UpdatePlan(new UpdatePlanRequest("PlanInexistente"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // ── ProductSupplies ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetProductSupplies_ProductNotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetProductSupplies("nonexistent-product");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetProductSupplies_ValidProduct_ReturnsList()
    {
        await CreateTenantAsync();
        var cat      = await CreateCategoryAsync(TenantId);
        var product  = await CreateProductAsync(TenantId, cat.Id);
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "Harina");

        Db.ProductSupplies.Add(new ProductSupply
        {
            TenantId         = TenantId,
            ProductId        = product.Id,
            SupplyId         = supply.Id,
            QuantityRequired = 0.5m,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetProductSupplies(product.Id);

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<ProductSupplyDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal(supply.Id, list[0].SupplyId);
    }

    [Fact]
    public async Task UpdateProductSupplies_InvalidSupply_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var cat     = await CreateCategoryAsync(TenantId);
        var product = await CreateProductAsync(TenantId, cat.Id);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateProductSupplies(product.Id, new UpdateProductSuppliesRequest
        {
            Supplies = [new ProductSupplyItem { SupplyId = "fake-supply-id", QuantityRequired = 1m, IsUnknownQuantity = false }]
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // ── UpdateTenantPause (A2 — pausar tienda) ──────────────────────────────────────

    [Fact]
    public async Task UpdateTenantPause_SetsIsPaused_DoesNotAffectOtherTenant()
    {
        var ownTenant   = await CreateTenantAsync(); // usa TenantId del test
        var otherTenant = await CreateTenantAsync(id: Guid.NewGuid().ToString(), slug: "otro-tenant-pause");

        var ctrl   = CreateController(); // claims con TenantId propio
        var result = await ctrl.UpdateTenantPause(new UpdateTenantPauseRequest(true));

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var updatedOwn   = await Db.Tenants.FindAsync(ownTenant.Id);
        var updatedOther = await Db.Tenants.FindAsync(otherTenant.Id);
        Assert.True(updatedOwn!.IsPaused);
        Assert.False(updatedOther!.IsPaused); // tenant isolation: el otro tenant no se ve afectado
    }

    [Fact]
    public async Task UpdateTenantPause_TenantNotFound_ReturnsNotFound()
    {
        // No creamos el tenant en DB
        var ctrl   = CreateController();
        var result = await ctrl.UpdateTenantPause(new UpdateTenantPauseRequest(true));

        Assert.IsType<NotFoundResult>(result);
    }
}
