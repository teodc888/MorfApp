using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Public;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Enums;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class PublicControllerTests : TestBase
{
    private Mock<IMercadoPagoService> _mockMp = null!;

    private PublicController CreateController(Dictionary<string, string?>? configOverrides = null)
    {
        _mockMp = new Mock<IMercadoPagoService>();
        _mockMp.Setup(m => m.CreateSubscriptionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
               .ReturnsAsync(new MpPreapprovalResult("preapproval-1", "https://mercadopago.com/checkout/preapproval-1"));

        var settings = new Dictionary<string, string?>
        {
            ["MercadoPago:PreapprovalPlanIds:Basico"] = "plan-basico",
            ["MercadoPago:PreapprovalPlanIds:Pro"] = "plan-pro",
            ["MercadoPago:PreapprovalPlanIds:Negocio"] = "plan-negocio",
        };
        if (configOverrides is not null)
            foreach (var (key, value) in configOverrides)
                settings[key] = value;

        var config = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();

        return new PublicController(Db, _mockMp.Object, config, NullLogger<PublicController>.Instance);
    }

    private static RegisterInterestRequest MakeRequest(
        string firstName      = "Juan",
        string lastName       = "Pérez",
        string email          = "juan@burger.com",
        string phone          = "1155667788",
        string restaurantName = "Mi Burger",
        string plan           = "Basico",
        string? colorPrimary  = null,
        string? colorAccent   = null,
        string? emojiIcon     = null)
        => new(firstName, lastName, email, phone, restaurantName, plan, colorPrimary, colorAccent, emojiIcon);

    // ── GetPlans ──────────────────────────────────────────────────────────────────

    [Fact]
    public void GetPlans_ReturnsAllThreePlansWithPrices()
    {
        var ctrl = CreateController();
        var result = ctrl.GetPlans();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var plans = Assert.IsType<List<PlanInfo>>(ok.Value);
        Assert.Equal(3, plans.Count);
        Assert.Contains(plans, p => p.Plan == "Basico" && p.MonthlyPriceArs == 20000m);
        Assert.Contains(plans, p => p.Plan == "Pro" && p.MonthlyPriceArs == 45000m);
        Assert.Contains(plans, p => p.Plan == "Negocio" && p.MonthlyPriceArs == 60000m);
    }

    // ── Register ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_ValidRequest_ReturnsCheckoutUrlAndTenantId()
    {
        var ctrl   = CreateController();
        var result = await ctrl.Register(MakeRequest());

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<RegisterResponse>(ok.Value);
        Assert.True(Guid.TryParse(dto.TenantId, out _));
        Assert.Equal("https://mercadopago.com/checkout/preapproval-1", dto.CheckoutUrl);
    }

    [Fact]
    public async Task Register_CreatesSlugFromRestaurantName()
    {
        var ctrl = CreateController();
        await ctrl.Register(MakeRequest(email: "ana@pizza.com", restaurantName: "La Gran Pizzería"));

        var tenant = Db.Tenants.Single(t => t.OwnerEmail == "ana@pizza.com");
        Assert.Equal("la-gran-pizzeria", tenant.Slug);
    }

    [Fact]
    public async Task Register_SlugCollision_AppendsNumber()
    {
        await CreateTenantAsync(id: Guid.NewGuid().ToString(), slug: "mi-restaurante");

        var ctrl = CreateController();
        await ctrl.Register(MakeRequest(email: "pedro@rest.com", restaurantName: "Mi Restaurante"));

        var newTenant = Db.Tenants.Single(t => t.OwnerEmail == "pedro@rest.com");
        Assert.Equal("mi-restaurante-2", newTenant.Slug);
    }

    [Fact]
    public async Task Register_MultipleCollisions_IncrementsCounter()
    {
        var t1 = await CreateTenantAsync(id: Guid.NewGuid().ToString(), slug: "mi-cafe");
        var t2 = await CreateTenantAsync(id: Guid.NewGuid().ToString(), slug: "mi-cafe-2");
        _ = t1; _ = t2;

        var ctrl = CreateController();
        await ctrl.Register(MakeRequest(email: "luis@cafe.com", restaurantName: "Mi Cafe"));

        var newTenant = Db.Tenants.Single(t => t.OwnerEmail == "luis@cafe.com");
        Assert.Equal("mi-cafe-3", newTenant.Slug);
    }

    [Fact]
    public async Task Register_InvalidPlan_Returns400()
    {
        var ctrl   = CreateController();
        var result = await ctrl.Register(MakeRequest(plan: "PlanInvalido"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Theory]
    [InlineData("Basico")]
    [InlineData("Pro")]
    [InlineData("Negocio")]
    public async Task Register_EachValidPlan_ReturnsOk(string plan)
    {
        var ctrl   = CreateController();
        var result = await ctrl.Register(MakeRequest(email: $"test-{plan.ToLower()}@x.com", plan: plan));

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task Register_SlugStripsSpecialChars()
    {
        var ctrl = CreateController();
        await ctrl.Register(MakeRequest(email: "a@b.com", restaurantName: "Café & Bar — 2024!"));

        var tenant = Db.Tenants.Single(t => t.OwnerEmail == "a@b.com");
        Assert.Matches(@"^[a-z0-9-]+$", tenant.Slug);
    }

    [Fact]
    public async Task Register_TenantCreatedWithPendingStatus()
    {
        var ctrl = CreateController();
        await ctrl.Register(MakeRequest(email: "nuevo@tienda.com", restaurantName: "Tienda Nueva"));

        var tenant = Db.Tenants.Single(t => t.OwnerEmail == "nuevo@tienda.com");
        Assert.Equal(TenantStatus.Pending, tenant.Status);
    }

    [Fact]
    public async Task Register_OwnerNameConcatenatesFirstAndLastName()
    {
        var ctrl = CreateController();
        await ctrl.Register(MakeRequest(firstName: "María", lastName: "González", email: "maria@test.com"));

        var tenant = Db.Tenants.Single(t => t.OwnerEmail == "maria@test.com");
        Assert.Equal("María González", tenant.OwnerName);
    }

    [Fact]
    public async Task Register_StoresMercadoPagoPreapprovalId()
    {
        var ctrl = CreateController();
        var result = await ctrl.Register(MakeRequest(email: "mp@test.com"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<RegisterResponse>(ok.Value);

        var tenant = await Db.Tenants.FindAsync(dto.TenantId);
        Assert.Equal("preapproval-1", tenant!.MpPreapprovalId);
    }

    [Fact]
    public async Task Register_CreatesTenantBrandingWithChosenColors()
    {
        var ctrl = CreateController();
        var result = await ctrl.Register(MakeRequest(email: "colores@test.com", colorPrimary: "#123456", colorAccent: "#abcdef"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<RegisterResponse>(ok.Value);

        var branding = Db.TenantBrandings.Single(b => b.TenantId == dto.TenantId);
        Assert.Equal("#123456", branding.ColorPrimary);
        Assert.Equal("#abcdef", branding.ColorAccent);
    }

    [Fact]
    public async Task Register_NoColorsProvided_UsesDefaultBranding()
    {
        var ctrl = CreateController();
        var result = await ctrl.Register(MakeRequest(email: "sincolor@test.com"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<RegisterResponse>(ok.Value);

        var branding = Db.TenantBrandings.Single(b => b.TenantId == dto.TenantId);
        Assert.Equal("#e8390e", branding.ColorPrimary);
        Assert.Equal("#25D366", branding.ColorAccent);
    }

    [Fact]
    public async Task Register_CustomEmoji_IsSavedOnBranding()
    {
        var ctrl = CreateController();
        var req = MakeRequest(email: "pizzeria@test.com", emojiIcon: "🍕");
        var result = await ctrl.Register(req);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<RegisterResponse>(ok.Value);

        var branding = Db.TenantBrandings.Single(b => b.TenantId == dto.TenantId);
        Assert.Equal("🍕", branding.EmojiIcon);
    }

    [Fact]
    public async Task Register_NoEmojiProvided_DefaultsToHamburger()
    {
        var ctrl = CreateController();
        var result = await ctrl.Register(MakeRequest(email: "sinemoji@test.com"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<RegisterResponse>(ok.Value);

        var branding = Db.TenantBrandings.Single(b => b.TenantId == dto.TenantId);
        Assert.Equal("🍔", branding.EmojiIcon);
    }

    // ── GetTenantSummary ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTenantSummary_ExistingTenant_ReturnsNameSlugAndBranding()
    {
        var ctrl = CreateController();
        var registerResult = await ctrl.Register(MakeRequest(email: "resumen@test.com", restaurantName: "La Pizzeria del Barrio"));
        var registerOk = Assert.IsType<OkObjectResult>(registerResult.Result);
        var registerDto = Assert.IsType<RegisterResponse>(registerOk.Value);

        var result = await ctrl.GetTenantSummary(registerDto.TenantId);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TenantSummaryDto>(ok.Value);
        Assert.Equal("La Pizzeria del Barrio", dto.Name);
        Assert.Equal("la-pizzeria-del-barrio", dto.Slug);
    }

    [Fact]
    public async Task GetTenantSummary_NotFound_ReturnsNotFound()
    {
        var ctrl = CreateController();
        var result = await ctrl.GetTenantSummary("no-existe");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Register_NoPreapprovalPlanConfigured_Returns503AndDoesNotCreateTenant()
    {
        var ctrl = CreateController(new Dictionary<string, string?> { ["MercadoPago:PreapprovalPlanIds:Basico"] = null });
        var result = await ctrl.Register(MakeRequest(email: "sinplan@test.com"));

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(503, status.StatusCode);
        Assert.False(Db.Tenants.Any(t => t.OwnerEmail == "sinplan@test.com"));
    }

    [Fact]
    public async Task Register_MercadoPagoFails_Returns502AndDoesNotPersistTenant()
    {
        var ctrl = CreateController();
        _mockMp.Setup(m => m.CreateSubscriptionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
               .ThrowsAsync(new HttpRequestException("timeout"));

        var result = await ctrl.Register(MakeRequest(email: "mpfalla@test.com"));

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(502, status.StatusCode);
        Assert.False(Db.Tenants.Any(t => t.OwnerEmail == "mpfalla@test.com"));
    }
}
