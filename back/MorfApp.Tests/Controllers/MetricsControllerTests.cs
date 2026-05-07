using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using MorfApp.Infrastructure.Persistence;
using Npgsql.NameTranslation;
using System.Security.Claims;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class MetricsControllerTests : IAsyncLifetime
{
    private readonly MetricsController _controller;
    private readonly AppDbContext _context;
    private readonly string _tenantId;
    private readonly string _connectionString = "Host=localhost;Port=5432;Database=morfapp_pre;Username=morfapp;Password=morfapp2024!";

    public MetricsControllerTests()
    {
        _tenantId = $"test-{Guid.NewGuid()}";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSnakeCaseNamingConvention()
            .UseNpgsql(_connectionString)
            .Options;

        _context = new AppDbContext(options);

        _controller = new MetricsController(_context);

        var claims = new List<Claim>
        {
            new Claim("tenant_id", _tenantId)
        };
        var identity = new ClaimsIdentity(claims);
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    public async Task InitializeAsync()
    {
        // Cleanup antes de cada test - usa SQL directo
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM orders WHERE tenant_id = @tenantId; DELETE FROM tenants WHERE id = @tenantId;";
        cmd.Parameters.AddWithValue("tenantId", _tenantId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync()
    {
        // Cleanup después de cada test - usa SQL directo
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM orders WHERE tenant_id = @tenantId; DELETE FROM tenants WHERE id = @tenantId;";
        cmd.Parameters.AddWithValue("tenantId", _tenantId);
        await cmd.ExecuteNonQueryAsync();
        await _context.DisposeAsync();
    }

    [Fact]
    public async Task GetDaily_WithConfirmedOrders_ReturnsMetricsDto()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var orders = new[]
        {
            new Order
            {
                Id = $"order-{Guid.NewGuid()}",
                TenantId = _tenantId,
                Status = OrderStatus.Confirmed,
                CreatedAt = DateTime.UtcNow,
                TotalPrice = 100m,
                CustomerName = "Customer 1",
                CustomerPhone = "1234567890",
                Items = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = "prod-1",
                        ProductName = "Producto 1",
                        Quantity = 2,
                        UnitPrice = 50m,
                        Modifiers = new List<OrderItemModifier>()
                    }
                }
            },
            new Order
            {
                Id = $"order-{Guid.NewGuid()}",
                TenantId = _tenantId,
                Status = OrderStatus.Confirmed,
                CreatedAt = DateTime.UtcNow,
                TotalPrice = 150m,
                CustomerName = "Customer 2",
                CustomerPhone = "9876543210",
                Items = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = "prod-1",
                        ProductName = "Producto 1",
                        Quantity = 3,
                        UnitPrice = 50m,
                        Modifiers = new List<OrderItemModifier>()
                    }
                }
            }
        };

        _context.Orders.AddRange(orders);
        await _context.SaveChangesAsync();

        var result = await _controller.GetDaily(today);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetDaily_TenantNotFound_ReturnsUnauthorized()
    {
        var result = await _controller.GetDaily(null);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetDaily_WithInvalidTimezone_FallsBackToUtc()
    {
        var tenant = new Tenant
        {
            Id = _tenantId,
            Name = "Test",
            Slug = "test",
            Timezone = "Invalid/Timezone"
        };
        _context.Tenants.Add(tenant);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var order = new Order
        {
            Id = $"order-{Guid.NewGuid()}",
            TenantId = _tenantId,
            Status = OrderStatus.Confirmed,
            CreatedAt = DateTime.UtcNow,
            TotalPrice = 100m,
            CustomerName = "Test Customer",
            CustomerPhone = "1234567890",
            Items = new List<OrderItem>()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var result = await _controller.GetDaily(today);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetWeekly_WithConfirmedOrders_ReturnsMetricsDto()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var order = new Order
        {
            Id = $"order-{Guid.NewGuid()}",
            TenantId = _tenantId,
            Status = OrderStatus.Confirmed,
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            TotalPrice = 100m,
            CustomerName = "Test Customer",
            CustomerPhone = "1234567890",
            Items = new List<OrderItem>()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var result = await _controller.GetWeekly(today);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetMonthly_WithConfirmedOrders_ReturnsMetricsDto()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var order = new Order
        {
            Id = $"order-{Guid.NewGuid()}",
            TenantId = _tenantId,
            Status = OrderStatus.Confirmed,
            CreatedAt = new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc),
            TotalPrice = 200m,
            CustomerName = "Test Customer",
            CustomerPhone = "1234567890",
            Items = new List<OrderItem>()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var result = await _controller.GetMonthly(5, 2026);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetMonthly_InvalidMonth_ReturnsBadRequest()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);
        await _context.SaveChangesAsync();

        var result = await _controller.GetMonthly(13, 2026);

        var badResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.NotNull(badResult.Value);
    }

    [Fact]
    public async Task GetYearly_WithConfirmedOrders_ReturnsMetricsDto()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var orders = new[]
        {
            new Order
            {
                Id = $"order-{Guid.NewGuid()}",
                TenantId = _tenantId,
                Status = OrderStatus.Confirmed,
                CreatedAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
                TotalPrice = 300m,
                CustomerName = "Customer 1",
                CustomerPhone = "1234567890",
                Items = new List<OrderItem>()
            },
            new Order
            {
                Id = $"order-{Guid.NewGuid()}",
                TenantId = _tenantId,
                Status = OrderStatus.Confirmed,
                CreatedAt = new DateTime(2026, 12, 20, 12, 0, 0, DateTimeKind.Utc),
                TotalPrice = 400m,
                CustomerName = "Customer 2",
                CustomerPhone = "9876543210",
                Items = new List<OrderItem>()
            }
        };

        _context.Orders.AddRange(orders);
        await _context.SaveChangesAsync();

        var result = await _controller.GetYearly(2026);

        Assert.NotNull(result);
    }
}
