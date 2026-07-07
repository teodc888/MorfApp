using Microsoft.AspNetCore.RateLimiting;
using MorfApp.Api.Controllers;
using System.Linq;
using Xunit;

namespace MorfApp.Tests.Controllers;

// Tests basados en reflection: este proyecto de tests es 100% unitario (invoca métodos de
// controller directamente vía TestBase, sin WebApplicationFactory/TestServer, ya que Program.cs
// ejecuta migraciones reales contra Postgres al arrancar, no disponible en este entorno).
// Un test de integración real que dispare el rate limiter requeriría ese TestServer, así que
// verificamos que la política de rate limiting correcta está declarada vía atributos.
public class RateLimitingAttributesTests
{
    [Fact]
    public void AuthController_HasAuthRateLimitPolicy()
    {
        var attr = typeof(AuthController)
            .GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: true)
            .Cast<EnableRateLimitingAttribute>()
            .FirstOrDefault();

        Assert.NotNull(attr);
        Assert.Equal("auth", attr!.PolicyName);
    }

    [Fact]
    public void PublicController_HasPublicRateLimitPolicy()
    {
        var attr = typeof(PublicController)
            .GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: true)
            .Cast<EnableRateLimitingAttribute>()
            .FirstOrDefault();

        Assert.NotNull(attr);
        Assert.Equal("public", attr!.PolicyName);
    }

    [Fact]
    public void StoreController_CreateOrder_HasStoreRateLimitPolicy()
    {
        var method = typeof(StoreController).GetMethod(nameof(StoreController.CreateOrder));
        var attr = method!
            .GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: true)
            .Cast<EnableRateLimitingAttribute>()
            .FirstOrDefault();

        Assert.NotNull(attr);
        Assert.Equal("store", attr!.PolicyName);
    }
}
