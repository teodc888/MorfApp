using Microsoft.AspNetCore.Mvc;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.Text;
using Xunit;

namespace MorfApp.Tests.Controllers;

/// <summary>
/// Tests del MetricsController — usa EF InMemory (sin PostgreSQL).
/// </summary>
public class MetricsControllerTests : TestBase
{
    private MetricsController CreateController()
    {
        var ctrl = new MetricsController(Db);
        SetupTenantClaims(ctrl, TenantId);
        return ctrl;
    }

    [Fact]
    public async Task GetDaily_WithConfirmedOrders_ReturnsMetricsDto()
    {
        await CreateTenantAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        Db.Orders.AddRange(
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = DateTime.UtcNow, TotalPrice = 100m, CustomerName = "C1", CustomerPhone = "1", Items = [new OrderItem { ProductId = "p1", ProductName = "Prod", Quantity = 2, UnitPrice = 50m, Modifiers = [] }] },
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = DateTime.UtcNow, TotalPrice = 150m, CustomerName = "C2", CustomerPhone = "2", Items = [] }
        );
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetDaily(today);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(2,    dto.TotalOrders);
        Assert.Equal(250m, dto.TotalRevenue);
    }

    [Fact]
    public async Task GetDaily_TenantNotFound_ReturnsUnauthorized()
    {
        // No creamos tenant — GetDaily debe retornar Unauthorized
        var ctrl   = CreateController();
        var result = await ctrl.GetDaily(null);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetDaily_OnlyCountsConfirmedOrders()
    {
        await CreateTenantAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        Db.Orders.AddRange(
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = DateTime.UtcNow, TotalPrice = 100m, CustomerName = "C1", CustomerPhone = "1", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Pending,   CreatedAt = DateTime.UtcNow, TotalPrice = 200m, CustomerName = "C2", CustomerPhone = "2", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Cancelled, CreatedAt = DateTime.UtcNow, TotalPrice = 300m, CustomerName = "C3", CustomerPhone = "3", Items = [] }
        );
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetDaily(today);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(1,    dto.TotalOrders);
        Assert.Equal(100m, dto.TotalRevenue);
    }

    [Fact]
    public async Task GetDaily_CountsOrdersInPreparingReadyOrDelivered_ExcludesPendingAndCancelled()
    {
        await CreateTenantAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        Db.Orders.AddRange(
            new Order { TenantId = TenantId, Status = OrderStatus.Preparing, CreatedAt = DateTime.UtcNow, TotalPrice = 10m, CustomerName = "C1", CustomerPhone = "1", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Ready,     CreatedAt = DateTime.UtcNow, TotalPrice = 20m, CustomerName = "C2", CustomerPhone = "2", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Delivered, CreatedAt = DateTime.UtcNow, TotalPrice = 30m, CustomerName = "C3", CustomerPhone = "3", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Pending,   CreatedAt = DateTime.UtcNow, TotalPrice = 1000m, CustomerName = "C4", CustomerPhone = "4", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Cancelled, CreatedAt = DateTime.UtcNow, TotalPrice = 2000m, CustomerName = "C5", CustomerPhone = "5", Items = [] }
        );
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetDaily(today);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(3,   dto.TotalOrders); // Preparing + Ready + Delivered
        Assert.Equal(60m, dto.TotalRevenue); // Pending y Cancelled quedan afuera
    }

    [Fact]
    public async Task GetDaily_NoOrders_ReturnsZeroMetrics()
    {
        await CreateTenantAsync();
        var today  = DateOnly.FromDateTime(DateTime.UtcNow);
        var ctrl   = CreateController();
        var result = await ctrl.GetDaily(today);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(0,  dto.TotalOrders);
        Assert.Equal(0m, dto.TotalRevenue);
        Assert.Equal(0m, dto.AverageOrderValue);
    }

    [Fact]
    public async Task GetWeekly_WithConfirmedOrders_ReturnsMetricsDto()
    {
        await CreateTenantAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        Db.Orders.Add(new Order
        {
            TenantId = TenantId, Status = OrderStatus.Confirmed,
            CreatedAt = DateTime.UtcNow.AddDays(-1), TotalPrice = 100m,
            CustomerName = "Test", CustomerPhone = "1", Items = []
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetWeekly(today);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(1, dto.TotalOrders);
    }

    [Fact]
    public async Task GetMonthly_WithConfirmedOrders_ReturnsMetricsDto()
    {
        await CreateTenantAsync();

        Db.Orders.Add(new Order
        {
            TenantId = TenantId, Status = OrderStatus.Confirmed,
            CreatedAt = new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc),
            TotalPrice = 200m, CustomerName = "Test", CustomerPhone = "1", Items = []
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetMonthly(5, 2026);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(1,    dto.TotalOrders);
        Assert.Equal(200m, dto.TotalRevenue);
    }

    [Fact]
    public async Task GetMonthly_InvalidMonth_ReturnsBadRequest()
    {
        await CreateTenantAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetMonthly(13, 2026);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetMonthly_InvalidMonth_Zero_ReturnsBadRequest()
    {
        await CreateTenantAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetMonthly(0, 2026);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetYearly_WithConfirmedOrders_ReturnsMetricsDto()
    {
        await CreateTenantAsync();

        Db.Orders.AddRange(
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = new DateTime(2026, 6,  15, 12, 0, 0, DateTimeKind.Utc), TotalPrice = 300m, CustomerName = "C1", CustomerPhone = "1", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = new DateTime(2026, 12, 20, 12, 0, 0, DateTimeKind.Utc), TotalPrice = 400m, CustomerName = "C2", CustomerPhone = "2", Items = [] }
        );
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetYearly(2026);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(2,    dto.TotalOrders);
        Assert.Equal(700m, dto.TotalRevenue);
    }

    [Fact]
    public async Task GetYearly_CountsUniqueCustomers()
    {
        await CreateTenantAsync();

        // Mismo teléfono = mismo cliente
        Db.Orders.AddRange(
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc), TotalPrice = 100m, CustomerName = "A", CustomerPhone = "111", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc), TotalPrice = 100m, CustomerName = "A", CustomerPhone = "111", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc), TotalPrice = 100m, CustomerName = "B", CustomerPhone = "222", Items = [] }
        );
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetYearly(2026);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(2, dto.TotalCustomers); // 111 y 222
    }

    [Fact]
    public async Task GetYearly_AverageOrderValue_IsCalculatedCorrectly()
    {
        await CreateTenantAsync();

        Db.Orders.AddRange(
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), TotalPrice = 100m, CustomerName = "A", CustomerPhone = "1", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), TotalPrice = 300m, CustomerName = "B", CustomerPhone = "2", Items = [] }
        );
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetYearly(2026);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MetricsDto>(ok.Value);
        Assert.Equal(200m, dto.AverageOrderValue); // (100+300)/2
    }

    // ── ExportMetrics (A7 — export CSV) ──────────────────────────────────────────────

    private static string DecodeCsv(FileContentResult file) =>
        Encoding.UTF8.GetString(file.FileContents).TrimStart('﻿');

    [Fact]
    public async Task ExportMetrics_ReturnsFileContentResult_WithCsvContentType()
    {
        await CreateTenantAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ExportMetrics();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", file.ContentType);
    }

    [Fact]
    public async Task ExportMetrics_OnlyCountsConfirmedOrders()
    {
        await CreateTenantAsync();
        var day = new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc);

        Db.Orders.AddRange(
            new Order { TenantId = TenantId, Status = OrderStatus.Confirmed, CreatedAt = day, TotalPrice = 100m, CustomerName = "C1", CustomerPhone = "1", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Pending,   CreatedAt = day, TotalPrice = 200m, CustomerName = "C2", CustomerPhone = "2", Items = [] },
            new Order { TenantId = TenantId, Status = OrderStatus.Cancelled, CreatedAt = day, TotalPrice = 300m, CustomerName = "C3", CustomerPhone = "3", Items = [] }
        );
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ExportMetrics(
            from: new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
            to:   new DateTime(2026, 5, 31, 23, 59, 59, DateTimeKind.Utc));

        var file    = Assert.IsType<FileContentResult>(result);
        var content = DecodeCsv(file);

        Assert.Contains("Fecha;CantidadPedidos;Facturacion;TicketPromedio", content);
        Assert.Contains("1;100,00;100,00", content); // solo el pedido Confirmed cuenta (Pending y Cancelled quedan afuera)

        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(2, lines.Length); // header + 1 día
    }

    [Fact]
    public async Task ExportMetrics_OnlyReturnsTenantData()
    {
        await CreateTenantAsync();
        var day = new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc);

        Db.Orders.AddRange(
            new Order { TenantId = TenantId,      Status = OrderStatus.Confirmed, CreatedAt = day, TotalPrice = 100m, CustomerName = "C1", CustomerPhone = "1", Items = [] },
            new Order { TenantId = "otro-tenant", Status = OrderStatus.Confirmed, CreatedAt = day, TotalPrice = 500m, CustomerName = "C2", CustomerPhone = "2", Items = [] }
        );
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ExportMetrics(
            from: new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
            to:   new DateTime(2026, 5, 31, 23, 59, 59, DateTimeKind.Utc));

        var file    = Assert.IsType<FileContentResult>(result);
        var content = DecodeCsv(file);

        Assert.Contains("100,00", content);
        Assert.DoesNotContain("500,00", content);

        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(2, lines.Length); // header + 1 día (solo el propio tenant)
    }
}
