using Microsoft.AspNetCore.Mvc;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Public;
using MorfApp.Domain.Enums;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class PublicControllerTests : TestBase
{
    private PublicController CreateController() => new(Db);

    private static RegisterInterestRequest MakeRequest(
        string firstName      = "Juan",
        string lastName       = "Pérez",
        string email          = "juan@burger.com",
        string phone          = "1155667788",
        string restaurantName = "Mi Burger",
        string plan           = "Basico")
        => new(firstName, lastName, email, phone, restaurantName, plan);

    // ── Register ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_ValidRequest_Returns200WithTenantId()
    {
        var ctrl   = CreateController();
        var result = await ctrl.Register(MakeRequest()) as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(200, result!.StatusCode);

        var tenantId = result.Value?.GetType().GetProperty("tenantId")?.GetValue(result.Value) as string;
        Assert.NotNull(tenantId);
        Assert.True(Guid.TryParse(tenantId, out _));
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
        var result = await ctrl.Register(MakeRequest(plan: "PlanInvalido")) as BadRequestObjectResult;

        Assert.NotNull(result);
        Assert.Equal(400, result!.StatusCode);
    }

    [Theory]
    [InlineData("Basico")]
    [InlineData("Pro")]
    public async Task Register_EachValidPlan_Returns200(string plan)
    {
        var ctrl   = CreateController();
        var result = await ctrl.Register(MakeRequest(email: $"test-{plan.ToLower()}@x.com", plan: plan));

        Assert.IsType<OkObjectResult>(result);
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
}
