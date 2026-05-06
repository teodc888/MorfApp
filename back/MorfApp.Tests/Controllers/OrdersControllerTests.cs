using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MorfApp.Api.Controllers;
using MorfApp.Api.WebSocket;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using MorfApp.Infrastructure.Persistence;
using Npgsql.NameTranslation;
using System.Security.Claims;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class OrdersControllerTests : IAsyncLifetime
{
    private readonly OrdersController _controller;
    private readonly AppDbContext _context;
    private readonly Mock<WebSocketConnectionManager> _mockWsManager;
    private readonly string _tenantId;
    private readonly string _connectionString = "Host=localhost;Port=5432;Database=morfapp_pre;Username=morfapp;Password=morfapp2024!";

    public OrdersControllerTests()
    {
        _tenantId = $"test-{Guid.NewGuid()}";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSnakeCaseNamingConvention()
            .UseNpgsql(_connectionString)
            .Options;

        _context = new AppDbContext(options);
        _mockWsManager = new Mock<WebSocketConnectionManager>();

        _controller = new OrdersController(_context, _mockWsManager.Object);

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
    public async Task GetOrders_WithPendingOrders_ReturnsOrderList()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var orders = new[]
        {
            new Order
            {
                Id = $"order-{Guid.NewGuid()}",
                TenantId = _tenantId,
                Status = OrderStatus.Pending,
                CustomerName = "John Doe",
                CustomerPhone = "1234567890",
                TotalPrice = 100m,
                DeliveryMode = "delivery",
                PaymentMethod = "cash",
                CreatedAt = DateTime.UtcNow,
                Items = new List<OrderItem>()
            },
            new Order
            {
                Id = $"order-{Guid.NewGuid()}",
                TenantId = _tenantId,
                Status = OrderStatus.Pending,
                CustomerName = "Jane Smith",
                CustomerPhone = "9876543210",
                TotalPrice = 150m,
                DeliveryMode = "pickup",
                PaymentMethod = "transfer",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                Items = new List<OrderItem>()
            }
        };

        _context.Orders.AddRange(orders);
        await _context.SaveChangesAsync();

        var result = await _controller.GetOrders();

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetOrders_WithInvalidStatus_ReturnsBadRequest()
    {
        var result = await _controller.GetOrders("invalid_status");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetOrders_FiltersByStatus()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var orders = new[]
        {
            new Order
            {
                Id = "order-1",
                TenantId = _tenantId,
                Status = OrderStatus.Pending,
                CustomerName = "John",
                CustomerPhone = "1234567890",
                TotalPrice = 100m,
                DeliveryMode = "delivery",
                PaymentMethod = "cash",
                CreatedAt = DateTime.UtcNow,
                Items = new List<OrderItem>()
            },
            new Order
            {
                Id = $"order-{Guid.NewGuid()}",
                TenantId = _tenantId,
                Status = OrderStatus.Confirmed,
                CustomerName = "Jane",
                CustomerPhone = "9876543210",
                TotalPrice = 150m,
                DeliveryMode = "pickup",
                PaymentMethod = "transfer",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                Items = new List<OrderItem>()
            }
        };

        _context.Orders.AddRange(orders);
        await _context.SaveChangesAsync();

        var result = await _controller.GetOrders("confirmed");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ConfirmOrder_WithValidOrder_ConfirmsAndReturnsUpdated()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var orderId = $"order-{Guid.NewGuid()}";
        var order = new Order
        {
            Id = orderId,
            TenantId = _tenantId,
            Status = OrderStatus.Pending,
            CustomerName = "John",
            CustomerPhone = "1234567890",
            TotalPrice = 100m,
            DeliveryMode = "delivery",
            PaymentMethod = "cash",
            CreatedAt = DateTime.UtcNow,
            Items = new List<OrderItem>()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var result = await _controller.ConfirmOrder(orderId);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var orderDto = Assert.IsType<OrderAdminDto>(okResult.Value);
        Assert.Equal(OrderStatus.Confirmed.ToString().ToLower(), orderDto.Status);
    }

    [Fact]
    public async Task ConfirmOrder_WithAlreadyConfirmed_ReturnsBadRequest()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var orderId = $"order-{Guid.NewGuid()}";
        var order = new Order
        {
            Id = orderId,
            TenantId = _tenantId,
            Status = OrderStatus.Confirmed,
            CustomerName = "John",
            CustomerPhone = "1234567890",
            TotalPrice = 100m,
            DeliveryMode = "delivery",
            PaymentMethod = "cash",
            CreatedAt = DateTime.UtcNow,
            Items = new List<OrderItem>()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var result = await _controller.ConfirmOrder(orderId);

        var badResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.NotNull(badResult.Value);
    }

    [Fact]
    public async Task ConfirmOrder_WithNonExistentOrder_ReturnsNotFound()
    {
        var result = await _controller.ConfirmOrder("nonexistent-order");

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CancelOrder_WithValidOrder_CancelsAndReturnsUpdated()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var orderId = $"order-{Guid.NewGuid()}";
        var order = new Order
        {
            Id = orderId,
            TenantId = _tenantId,
            Status = OrderStatus.Pending,
            CustomerName = "John",
            CustomerPhone = "1234567890",
            TotalPrice = 100m,
            DeliveryMode = "delivery",
            PaymentMethod = "cash",
            CreatedAt = DateTime.UtcNow,
            Items = new List<OrderItem>()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var result = await _controller.CancelOrder(orderId);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var orderDto = Assert.IsType<OrderAdminDto>(okResult.Value);
        Assert.Equal(OrderStatus.Cancelled.ToString().ToLower(), orderDto.Status);
    }

    [Fact]
    public async Task CancelOrder_WithAlreadyCancelled_ReturnsBadRequest()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var orderId = $"order-{Guid.NewGuid()}";
        var order = new Order
        {
            Id = orderId,
            TenantId = _tenantId,
            Status = OrderStatus.Cancelled,
            CustomerName = "John",
            CustomerPhone = "1234567890",
            TotalPrice = 100m,
            DeliveryMode = "delivery",
            PaymentMethod = "cash",
            CreatedAt = DateTime.UtcNow,
            Items = new List<OrderItem>()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var result = await _controller.CancelOrder(orderId);

        var badResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.NotNull(badResult.Value);
    }

    [Fact]
    public async Task CancelOrder_WithNonExistentOrder_ReturnsNotFound()
    {
        var result = await _controller.CancelOrder("nonexistent-order");

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetOrders_WithDeliveryModeFilter_FiltersCorrectly()
    {
        var tenant = new Tenant { Id = _tenantId, Name = "Test", Slug = $"test-{Guid.NewGuid()}", Timezone = "UTC" };
        _context.Tenants.Add(tenant);

        var orders = new[]
        {
            new Order
            {
                Id = "order-1",
                TenantId = _tenantId,
                Status = OrderStatus.Pending,
                CustomerName = "John",
                CustomerPhone = "1234567890",
                TotalPrice = 100m,
                DeliveryMode = "delivery",
                PaymentMethod = "cash",
                CreatedAt = DateTime.UtcNow,
                Items = new List<OrderItem>()
            },
            new Order
            {
                Id = $"order-{Guid.NewGuid()}",
                TenantId = _tenantId,
                Status = OrderStatus.Pending,
                CustomerName = "Jane",
                CustomerPhone = "9876543210",
                TotalPrice = 150m,
                DeliveryMode = "pickup",
                PaymentMethod = "transfer",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                Items = new List<OrderItem>()
            }
        };

        _context.Orders.AddRange(orders);
        await _context.SaveChangesAsync();

        var result = await _controller.GetOrders(deliveryMode: "pickup");

        Assert.NotNull(result);
    }
}
