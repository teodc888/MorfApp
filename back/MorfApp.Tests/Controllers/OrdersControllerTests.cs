using Microsoft.AspNetCore.Mvc;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using MorfApp.Tests.Fakes;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Xunit;

namespace MorfApp.Tests.Controllers;

/// <summary>
/// Tests del OrdersController — usa EF InMemory (sin PostgreSQL).
/// </summary>
public class OrdersControllerTests : TestBase
{
    // JsonSerializer.Serialize por defecto escapa caracteres no-ASCII (á -> á) y
    // apóstrofes ('), así que para comparar mensajes de error con tildes/comillas
    // simples usamos un encoder relajado.
    private static readonly JsonSerializerOptions RelaxedJsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private OrdersController CreateController()
    {
        var ctrl = new OrdersController(Db, new FakeWebSocketManager());
        SetupTenantClaims(ctrl, TenantId);
        return ctrl;
    }

    /// <summary>
    /// Extrae un valor del objeto anónimo retornado por GetOrders
    /// serializando/deserializando a JsonElement.
    /// </summary>
    private static (int total, int itemCount) ExtractOrdersResponse(object value)
    {
        var json   = JsonSerializer.Serialize(value);
        var doc    = JsonDocument.Parse(json).RootElement;
        var total  = doc.GetProperty("total").GetInt32();
        var items  = doc.GetProperty("items");
        return (total, items.GetArrayLength());
    }

    // ── GetOrders ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetOrders_DefaultStatus_ReturnsPendingOrders()
    {
        await CreateTenantAsync();
        await CreateOrderAsync(TenantId, OrderStatus.Pending);
        await CreateOrderAsync(TenantId, OrderStatus.Pending);
        await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.GetOrders();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetOrders_FilterByConfirmed_ReturnsOnlyConfirmed()
    {
        await CreateTenantAsync();
        await CreateOrderAsync(TenantId, OrderStatus.Pending);
        await CreateOrderAsync(TenantId, OrderStatus.Confirmed);
        await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(status: "confirmed");

        var ok          = Assert.IsType<OkObjectResult>(result.Result);
        var (total, _)  = ExtractOrdersResponse(ok.Value!);
        Assert.Equal(2, total);
    }

    [Fact]
    public async Task GetOrders_InvalidStatus_ReturnsBadRequest()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(status: "estado_invalido");

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetOrders_SearchByName_FiltersCorrectly()
    {
        await CreateTenantAsync();
        Db.Orders.Add(new Order { TenantId = TenantId, CustomerName = "Carlos Perez", CustomerPhone = "1111", TotalPrice = 100m, DeliveryMode = "pickup", Status = OrderStatus.Pending, Items = [] });
        Db.Orders.Add(new Order { TenantId = TenantId, CustomerName = "Ana López",   CustomerPhone = "2222", TotalPrice = 200m, DeliveryMode = "delivery", Status = OrderStatus.Pending, Items = [] });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(q: "carlos");

        var ok         = Assert.IsType<OkObjectResult>(result.Result);
        var (total, _) = ExtractOrdersResponse(ok.Value!);
        Assert.Equal(1, total);
    }

    [Fact]
    public async Task GetOrders_Pagination_RespectsLimitAndOffset()
    {
        await CreateTenantAsync();
        for (int i = 0; i < 5; i++)
            await CreateOrderAsync(TenantId, OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(limit: 2, offset: 0);

        var ok                    = Assert.IsType<OkObjectResult>(result.Result);
        var (total, itemCount)    = ExtractOrdersResponse(ok.Value!);
        Assert.Equal(5, total);
        Assert.Equal(2, itemCount);
    }

    [Fact]
    public async Task GetOrders_OnlyReturnsTenantOrders()
    {
        await CreateTenantAsync();
        await CreateOrderAsync(TenantId,      OrderStatus.Pending);
        await CreateOrderAsync("otro-tenant", OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.GetOrders();

        var ok         = Assert.IsType<OkObjectResult>(result.Result);
        var (total, _) = ExtractOrdersResponse(ok.Value!);
        Assert.Equal(1, total);
    }

    // ── GetOrders con 'statuses' (lista, tiene prioridad sobre 'status') ────────────

    [Fact]
    public async Task GetOrders_StatusesParam_ReturnsOrdersMatchingAnyOfTheGivenStatuses()
    {
        await CreateTenantAsync();
        await CreateOrderAsync(TenantId, OrderStatus.Pending);
        await CreateOrderAsync(TenantId, OrderStatus.Confirmed);
        await CreateOrderAsync(TenantId, OrderStatus.Cancelled);
        await CreateOrderAsync(TenantId, OrderStatus.Preparing);

        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(statuses: "Pending,Confirmed");

        var ok         = Assert.IsType<OkObjectResult>(result.Result);
        var (total, _) = ExtractOrdersResponse(ok.Value!);
        Assert.Equal(2, total);
    }

    [Fact]
    public async Task GetOrders_StatusesParam_InvalidValue_ReturnsBadRequestWithMessage()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(statuses: "Pending,EstadoInventado");

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = JsonSerializer.Serialize(bad.Value, RelaxedJsonOptions);
        Assert.Contains("Estado inválido en 'statuses': 'EstadoInventado'.", json);
    }

    [Fact]
    public async Task GetOrders_StatusesParam_EmptyString_IsTreatedAsNotSent_FallsBackToStatusDefault()
    {
        // statuses="" es IsNullOrWhiteSpace -> el controller lo trata como "no enviado" y
        // usa el comportamiento default de 'status' (pending), sin dar 400.
        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(statuses: "");

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetOrders_StatusesParam_OnlyCommasAndSpaces_ReturnsBadRequestWithMessage()
    {
        // "  ,  " no es IsNullOrWhiteSpace (contiene una coma), pero al parsear con
        // TrimEntries + RemoveEmptyEntries no queda ningún valor -> 400.
        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(statuses: "  ,  ");

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = JsonSerializer.Serialize(bad.Value, RelaxedJsonOptions);
        Assert.Contains("El parámetro 'statuses' no puede estar vacío.", json);
    }

    [Fact]
    public async Task GetOrders_StatusesParam_TakesPriorityOverStatusParam()
    {
        await CreateTenantAsync();
        await CreateOrderAsync(TenantId, OrderStatus.Pending);
        await CreateOrderAsync(TenantId, OrderStatus.Cancelled);

        var ctrl   = CreateController();
        var result = await ctrl.GetOrders(status: "cancelled", statuses: "Pending");

        var ok         = Assert.IsType<OkObjectResult>(result.Result);
        var (total, _) = ExtractOrdersResponse(ok.Value!);
        Assert.Equal(1, total); // devuelve el Pending (statuses gana), no el Cancelled
    }

    // ── ExportOrders (A7 — export CSV) ──────────────────────────────────────────────

    private static string DecodeCsv(FileContentResult file) =>
        Encoding.UTF8.GetString(file.FileContents).TrimStart('﻿');

    [Fact]
    public async Task ExportOrders_ReturnsFileContentResult_WithCsvContentType()
    {
        await CreateTenantAsync();
        await CreateOrderAsync(TenantId, OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.ExportOrders();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", file.ContentType);
    }

    [Fact]
    public async Task ExportOrders_ContainsHeaderAndRowPerMatchingOrder()
    {
        await CreateTenantAsync();
        var order1 = await CreateOrderAsync(TenantId, OrderStatus.Pending);
        var order2 = await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.ExportOrders();

        var file    = Assert.IsType<FileContentResult>(result);
        var content = DecodeCsv(file);

        Assert.StartsWith("Id;Fecha;Cliente;Telefono;Estado;Modalidad;Direccion;MetodoPago;Total", content);
        Assert.Contains(order1.Id, content);
        Assert.Contains(order2.Id, content);

        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(3, lines.Length); // header + 2 pedidos
    }

    [Fact]
    public async Task ExportOrders_ExcludesOrdersFromOtherTenant()
    {
        await CreateTenantAsync();
        var ownOrder   = await CreateOrderAsync(TenantId, OrderStatus.Pending);
        var otherOrder = await CreateOrderAsync("otro-tenant", OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.ExportOrders();

        var file    = Assert.IsType<FileContentResult>(result);
        var content = DecodeCsv(file);

        Assert.Contains(ownOrder.Id, content);
        Assert.DoesNotContain(otherOrder.Id, content);
    }

    [Fact]
    public async Task ExportOrders_FilterByStatus_ReturnsOnlyMatchingStatus()
    {
        await CreateTenantAsync();
        var pending   = await CreateOrderAsync(TenantId, OrderStatus.Pending);
        var confirmed = await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.ExportOrders(status: "confirmed");

        var file    = Assert.IsType<FileContentResult>(result);
        var content = DecodeCsv(file);

        Assert.Contains(confirmed.Id, content);
        Assert.DoesNotContain(pending.Id, content);
    }

    [Fact]
    public async Task ExportOrders_FilterByDateRange_ExcludesOrdersOutsideRange()
    {
        await CreateTenantAsync();

        var inRange = new Order
        {
            TenantId = TenantId, CustomerName = "Dentro", CustomerPhone = "111",
            TotalPrice = 100m, DeliveryMode = "delivery", PaymentMethod = "cash",
            Status = OrderStatus.Pending, Items = [],
            CreatedAt = new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc),
        };
        var outOfRange = new Order
        {
            TenantId = TenantId, CustomerName = "Fuera", CustomerPhone = "222",
            TotalPrice = 200m, DeliveryMode = "delivery", PaymentMethod = "cash",
            Status = OrderStatus.Pending, Items = [],
            CreatedAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
        };
        Db.Orders.AddRange(inRange, outOfRange);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ExportOrders(
            from: new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
            to:   new DateTime(2026, 5, 31, 23, 59, 59, DateTimeKind.Utc));

        var file    = Assert.IsType<FileContentResult>(result);
        var content = DecodeCsv(file);

        Assert.Contains(inRange.Id, content);
        Assert.DoesNotContain(outOfRange.Id, content);
    }

    // ── ConfirmOrder ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task ConfirmOrder_PendingOrder_ConfirmsAndReturnsDto()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.ConfirmOrder(order.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderAdminDto>(ok.Value);
        Assert.Equal("confirmed", dto.Status);
        Assert.NotNull(dto.ConfirmedAt);
    }

    [Fact]
    public async Task ConfirmOrder_AlreadyConfirmed_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.ConfirmOrder(order.Id);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task ConfirmOrder_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.ConfirmOrder("nonexistent-order");

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task ConfirmOrder_BelongsToOtherTenant_ReturnsNotFound()
    {
        var order = await CreateOrderAsync("otro-tenant", OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.ConfirmOrder(order.Id);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task ConfirmOrder_DeductsInventoryForProductSupplies()
    {
        await CreateTenantAsync();
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "Harina");
        supply.CurrentStock = 100m;
        await Db.SaveChangesAsync();

        var cat     = await CreateCategoryAsync(TenantId);
        var product = await CreateProductAsync(TenantId, cat.Id, "Pizza", 500m);

        Db.ProductSupplies.Add(new ProductSupply
        {
            TenantId          = TenantId,
            ProductId         = product.Id,
            SupplyId          = supply.Id,
            QuantityRequired  = 0.5m,
            IsUnknownQuantity = false,
        });
        await Db.SaveChangesAsync();

        var order = new Order
        {
            TenantId      = TenantId,
            CustomerName  = "Test",
            CustomerPhone = "123",
            TotalPrice    = 1000m,
            DeliveryMode  = "pickup",
            Status        = OrderStatus.Pending,
            Items         = [new OrderItem { ProductId = product.Id, ProductName = "Pizza", Quantity = 2, UnitPrice = 500m, Modifiers = [] }],
        };
        Db.Orders.Add(order);
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        await ctrl.ConfirmOrder(order.Id);

        var updatedSupply = await Db.Supplies.FindAsync(supply.Id);
        Assert.Equal(99m, updatedSupply!.CurrentStock); // 100 - (0.5 * 2)
    }

    [Fact]
    public async Task ConfirmOrder_MultipleItemsWithSharedSupply_DeductsStockAndCreatesMovementsPerProductSupply()
    {
        await CreateTenantAsync();
        var supplier = await CreateSupplierAsync(TenantId);

        var harina = await CreateSupplyAsync(TenantId, supplier.Id, "Harina");
        harina.CurrentStock = 100m;
        var queso = await CreateSupplyAsync(TenantId, supplier.Id, "Queso");
        queso.CurrentStock = 50m;
        await Db.SaveChangesAsync();

        var cat      = await CreateCategoryAsync(TenantId);
        var pizza    = await CreateProductAsync(TenantId, cat.Id, "Pizza", 500m);
        var empanada = await CreateProductAsync(TenantId, cat.Id, "Empanada", 100m);
        var bebida   = await CreateProductAsync(TenantId, cat.Id, "Bebida", 50m); // sin insumos asociados

        Db.ProductSupplies.AddRange(
            new ProductSupply { TenantId = TenantId, ProductId = pizza.Id, SupplyId = harina.Id, QuantityRequired = 0.5m, IsUnknownQuantity = false },
            new ProductSupply { TenantId = TenantId, ProductId = pizza.Id, SupplyId = queso.Id, QuantityRequired = 0.2m, IsUnknownQuantity = false },
            new ProductSupply { TenantId = TenantId, ProductId = empanada.Id, SupplyId = harina.Id, QuantityRequired = 0.1m, IsUnknownQuantity = false }
        );
        await Db.SaveChangesAsync();

        var order = new Order
        {
            TenantId      = TenantId,
            CustomerName  = "Test",
            CustomerPhone = "123",
            TotalPrice    = 1300m,
            DeliveryMode  = "pickup",
            Status        = OrderStatus.Pending,
            Items =
            [
                new OrderItem { ProductId = pizza.Id, ProductName = "Pizza", Quantity = 2, UnitPrice = 500m, Modifiers = [] },
                new OrderItem { ProductId = empanada.Id, ProductName = "Empanada", Quantity = 3, UnitPrice = 100m, Modifiers = [] },
                new OrderItem { ProductId = bebida.Id, ProductName = "Bebida", Quantity = 5, UnitPrice = 50m, Modifiers = [] },
            ],
        };
        Db.Orders.Add(order);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ConfirmOrder(order.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderAdminDto>(ok.Value);
        Assert.Equal("confirmed", dto.Status);

        var updatedHarina = await Db.Supplies.FindAsync(harina.Id);
        var updatedQueso  = await Db.Supplies.FindAsync(queso.Id);
        Assert.Equal(98.7m, updatedHarina!.CurrentStock); // 100 - (0.5*2 + 0.1*3)
        Assert.Equal(49.6m, updatedQueso!.CurrentStock);  // 50 - (0.2*2)

        var movements = Db.InventoryMovements.Where(m => m.ReferenceId == order.Id).ToList();
        Assert.Equal(3, movements.Count);
        Assert.All(movements, m =>
        {
            Assert.Equal("OrderDeducted", m.Reason);
            Assert.Equal(order.Id, m.ReferenceId);
            Assert.True(m.QuantityChange < 0);
        });

        var harinaMovements = movements.Where(m => m.SupplyId == harina.Id).ToList();
        Assert.Equal(2, harinaMovements.Count);
        Assert.Contains(harinaMovements, m => m.QuantityChange == -1.0m);
        Assert.Contains(harinaMovements, m => m.QuantityChange == -0.3m);

        var quesoMovement = Assert.Single(movements.Where(m => m.SupplyId == queso.Id));
        Assert.Equal(-0.4m, quesoMovement.QuantityChange);
    }

    [Fact]
    public async Task ConfirmOrder_UnknownQuantityProductSupply_DoesNotDeductStockOrCreateMovement()
    {
        await CreateTenantAsync();
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "Sal");
        supply.CurrentStock = 100m;
        await Db.SaveChangesAsync();

        var cat     = await CreateCategoryAsync(TenantId);
        var product = await CreateProductAsync(TenantId, cat.Id, "Pizza", 500m);

        Db.ProductSupplies.Add(new ProductSupply
        {
            TenantId          = TenantId,
            ProductId         = product.Id,
            SupplyId          = supply.Id,
            QuantityRequired  = 0.5m,
            IsUnknownQuantity = true,
        });
        await Db.SaveChangesAsync();

        var order = new Order
        {
            TenantId      = TenantId,
            CustomerName  = "Test",
            CustomerPhone = "123",
            TotalPrice    = 1000m,
            DeliveryMode  = "pickup",
            Status        = OrderStatus.Pending,
            Items         = [new OrderItem { ProductId = product.Id, ProductName = "Pizza", Quantity = 3, UnitPrice = 500m, Modifiers = [] }],
        };
        Db.Orders.Add(order);
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        await ctrl.ConfirmOrder(order.Id);

        var updatedSupply = await Db.Supplies.FindAsync(supply.Id);
        Assert.Equal(100m, updatedSupply!.CurrentStock); // no se descontó nada

        var movements = Db.InventoryMovements.Where(m => m.ReferenceId == order.Id).ToList();
        Assert.Empty(movements);
    }

    [Fact]
    public async Task ConfirmOrder_ProductWithoutSupplies_ConfirmsWithoutCreatingMovements()
    {
        await CreateTenantAsync();
        var cat     = await CreateCategoryAsync(TenantId);
        var product = await CreateProductAsync(TenantId, cat.Id, "Agua", 50m);

        var order = new Order
        {
            TenantId      = TenantId,
            CustomerName  = "Test",
            CustomerPhone = "123",
            TotalPrice    = 250m,
            DeliveryMode  = "pickup",
            Status        = OrderStatus.Pending,
            Items         = [new OrderItem { ProductId = product.Id, ProductName = "Agua", Quantity = 5, UnitPrice = 50m, Modifiers = [] }],
        };
        Db.Orders.Add(order);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ConfirmOrder(order.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderAdminDto>(ok.Value);
        Assert.Equal("confirmed", dto.Status);

        var movements = Db.InventoryMovements.Where(m => m.ReferenceId == order.Id).ToList();
        Assert.Empty(movements);
    }

    [Fact]
    public async Task ConfirmOrder_PendingOrder_BroadcastsOrderConfirmedEvent()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Pending);

        var wsManager = new FakeWebSocketManager();
        var ctrl = new OrdersController(Db, wsManager);
        SetupTenantClaims(ctrl, TenantId);

        await ctrl.ConfirmOrder(order.Id);

        Assert.Contains(wsManager.BroadcastedEvents, e =>
            e.TenantId == TenantId &&
            e.Event.Type == "order_confirmed");
    }

    // ── CancelOrder ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task CancelOrder_PendingOrder_CancelsAndReturnsDto()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.CancelOrder(order.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderAdminDto>(ok.Value);
        Assert.Equal("cancelled", dto.Status);
    }

    [Fact]
    public async Task CancelOrder_AlreadyCancelled_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Cancelled);

        var ctrl   = CreateController();
        var result = await ctrl.CancelOrder(order.Id);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CancelOrder_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.CancelOrder("nonexistent-order");

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CancelOrder_BelongsToOtherTenant_ReturnsNotFound()
    {
        var order = await CreateOrderAsync("otro-tenant", OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.CancelOrder(order.Id);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CancelOrder_ConfirmedOrder_CancelsSuccessfully()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.CancelOrder(order.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderAdminDto>(ok.Value);
        Assert.Equal("cancelled", dto.Status);
    }

    // ── UpdateStatus (C2 — estados de pedido ricos) ─────────────────────────────────

    [Fact]
    public async Task UpdateStatus_ConfirmedToPreparing_AdvancesStatus()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("preparing"));

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderAdminDto>(ok.Value);
        Assert.Equal("preparing", dto.Status);
    }

    [Fact]
    public async Task UpdateStatus_PreparingToReady_AdvancesStatus()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Preparing);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("ready"));

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderAdminDto>(ok.Value);
        Assert.Equal("ready", dto.Status);
    }

    [Fact]
    public async Task UpdateStatus_ReadyToDelivered_AdvancesStatus()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Ready);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("delivered"));

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OrderAdminDto>(ok.Value);
        Assert.Equal("delivered", dto.Status);
    }

    [Fact]
    public async Task UpdateStatus_PendingToReady_SkipsIntermediateStates_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Pending);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("ready"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateStatus_PreparingToDelivered_SkipsReady_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Preparing);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("delivered"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateStatus_UnrecognizedStatus_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("volando"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateStatus_ConfirmedToPreparing_BroadcastsOrderPreparingEvent()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Confirmed);

        var wsManager = new FakeWebSocketManager();
        var ctrl = new OrdersController(Db, wsManager);
        SetupTenantClaims(ctrl, TenantId);

        await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("preparing"));

        Assert.Contains(wsManager.BroadcastedEvents, e =>
            e.TenantId == TenantId && e.Event.Type == "order_preparing");
    }

    [Fact]
    public async Task UpdateStatus_PreparingToReady_BroadcastsOrderReadyEvent()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Preparing);

        var wsManager = new FakeWebSocketManager();
        var ctrl = new OrdersController(Db, wsManager);
        SetupTenantClaims(ctrl, TenantId);

        await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("ready"));

        Assert.Contains(wsManager.BroadcastedEvents, e =>
            e.TenantId == TenantId && e.Event.Type == "order_ready");
    }

    [Fact]
    public async Task UpdateStatus_ReadyToDelivered_BroadcastsOrderDeliveredEvent()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Ready);

        var wsManager = new FakeWebSocketManager();
        var ctrl = new OrdersController(Db, wsManager);
        SetupTenantClaims(ctrl, TenantId);

        await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("delivered"));

        Assert.Contains(wsManager.BroadcastedEvents, e =>
            e.TenantId == TenantId && e.Event.Type == "order_delivered");
    }

    [Fact]
    public async Task UpdateStatus_BelongsToOtherTenant_ReturnsNotFound()
    {
        var order = await CreateOrderAsync("otro-tenant", OrderStatus.Confirmed);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateStatus(order.Id, new UpdateOrderStatusRequest("preparing"));

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateStatus_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.UpdateStatus("nonexistent-order", new UpdateOrderStatusRequest("preparing"));

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    // ── CancelOrder — nueva restricción (C2): no se puede cancelar post-Preparing ───

    [Fact]
    public async Task CancelOrder_PreparingOrder_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Preparing);

        var ctrl   = CreateController();
        var result = await ctrl.CancelOrder(order.Id);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CancelOrder_ReadyOrder_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Ready);

        var ctrl   = CreateController();
        var result = await ctrl.CancelOrder(order.Id);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CancelOrder_DeliveredOrder_ReturnsBadRequest()
    {
        await CreateTenantAsync();
        var order = await CreateOrderAsync(TenantId, OrderStatus.Delivered);

        var ctrl   = CreateController();
        var result = await ctrl.CancelOrder(order.Id);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
