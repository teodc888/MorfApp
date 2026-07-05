using Microsoft.AspNetCore.Mvc;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Domain.Entities;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class SupplyControllerTests : TestBase
{
    private SupplyController CreateController()
    {
        var ctrl = new SupplyController(Db);
        SetupTenantClaims(ctrl, TenantId);
        return ctrl;
    }

    // ── GetSupplies ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSupplies_ReturnsOnlyActiveFromTenant()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        await CreateSupplyAsync(TenantId, supplier.Id, "Harina");
        await CreateSupplyAsync(TenantId, supplier.Id, "Azúcar");

        // Inactivo en mismo tenant
        Db.Supplies.Add(new Supply { TenantId = TenantId, Name = "Inactivo", IsActive = false });
        // Activo de otro tenant
        Db.Supplies.Add(new Supply { TenantId = "otro",  Name = "Ajeno",   IsActive = true });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetSupplies();

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SupplyDto>>(ok.Value);
        Assert.Equal(2, list.Count);
        Assert.All(list, s => Assert.True(s.IsActive));
    }

    [Fact]
    public async Task GetSupplies_IncludesSupplierName()
    {
        var supplier = await CreateSupplierAsync(TenantId, "Mi Proveedor");
        await CreateSupplyAsync(TenantId, supplier.Id, "Leche");

        var ctrl   = CreateController();
        var result = await ctrl.GetSupplies();

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SupplyDto>>(ok.Value);
        Assert.Equal("Mi Proveedor", list[0].SupplierName);
    }

    // ── CreateSupply ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateSupply_ValidData_ReturnsCreated()
    {
        var supplier = await CreateSupplierAsync(TenantId, "Prov Test");

        var ctrl   = CreateController();
        var result = await ctrl.CreateSupply(new CreateSupplyRequest
        {
            Name       = "  Sal  ",
            Unit       = "kg",
            SupplierId = supplier.Id,
        });

        var created = Assert.IsType<CreatedResult>(result.Result);
        var dto     = Assert.IsType<SupplyDto>(created.Value);
        Assert.Equal("Sal", dto.Name); // trimmed
        Assert.Equal("kg",  dto.Unit);
        Assert.Equal(supplier.Id, dto.SupplierId);
    }

    [Fact]
    public async Task CreateSupply_NoSupplierId_ReturnsBadRequest()
    {
        var ctrl   = CreateController();
        var result = await ctrl.CreateSupply(new CreateSupplyRequest
        {
            Name       = "Aceite",
            SupplierId = null,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateSupply_NonExistentSupplier_ReturnsBadRequest()
    {
        var ctrl   = CreateController();
        var result = await ctrl.CreateSupply(new CreateSupplyRequest
        {
            Name       = "Aceite",
            SupplierId = "proveedor-inexistente",
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateSupply_InactiveSupplier_ReturnsBadRequest()
    {
        var supplier = new Supplier { TenantId = TenantId, Name = "Inactivo", IsActive = false };
        Db.Suppliers.Add(supplier);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreateSupply(new CreateSupplyRequest
        {
            Name       = "Aceite",
            SupplierId = supplier.Id,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // ── UpdateSupply ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateSupply_ValidData_ReturnsOk()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "Original");

        var ctrl   = CreateController();
        var result = await ctrl.UpdateSupply(supply.Id, new UpdateSupplyRequest
        {
            Name       = "Actualizado",
            Unit       = "litros",
            SupplierId = supplier.Id,
        });

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SupplyDto>(ok.Value);
        Assert.Equal("Actualizado", dto.Name);
        Assert.Equal("litros", dto.Unit);
    }

    [Fact]
    public async Task UpdateSupply_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.UpdateSupply("nonexistent", new UpdateSupplyRequest
        {
            Name       = "Test",
            SupplierId = "any",
        });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateSupply_NoSupplierId_ReturnsBadRequest()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id);

        var ctrl   = CreateController();
        var result = await ctrl.UpdateSupply(supply.Id, new UpdateSupplyRequest
        {
            Name       = "Test",
            SupplierId = null,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // ── DeleteSupply ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteSupply_NotUsedByProducts_SoftDeletesAndReturnsNoContent()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "Libre");

        var ctrl   = CreateController();
        var result = await ctrl.DeleteSupply(supply.Id);

        Assert.IsType<NoContentResult>(result);
        var deleted = await Db.Supplies.FindAsync(supply.Id);
        Assert.False(deleted!.IsActive);
    }

    [Fact]
    public async Task DeleteSupply_UsedByProduct_ReturnsBadRequest()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "En Uso");
        var cat      = await CreateCategoryAsync(TenantId);
        var product  = await CreateProductAsync(TenantId, cat.Id);

        // Asociar insumo al producto
        Db.ProductSupplies.Add(new ProductSupply
        {
            TenantId         = TenantId,
            ProductId        = product.Id,
            SupplyId         = supply.Id,
            QuantityRequired = 1m,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.DeleteSupply(supply.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteSupply_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.DeleteSupply("nonexistent-supply");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── ResetStock ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ResetStock_ResetsToZeroAndCreatesMovement()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "Stock Alto");
        supply.CurrentStock = 50m;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ResetStock(supply.Id);

        Assert.IsType<NoContentResult>(result);
        var updated = await Db.Supplies.FindAsync(supply.Id);
        Assert.Equal(0m, updated!.CurrentStock);

        var movement = Db.InventoryMovements.FirstOrDefault(m => m.SupplyId == supply.Id);
        Assert.NotNull(movement);
        Assert.Equal(-50m, movement.QuantityChange);
        Assert.Equal("ManualReset", movement.Reason);
    }

    [Fact]
    public async Task ResetStock_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.ResetStock("nonexistent-supply");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── GetPurchases ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPurchases_ReturnsTenantPurchasesOnly()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id);

        Db.SupplyPurchases.Add(new SupplyPurchase
        {
            TenantId          = TenantId,
            SupplyId          = supply.Id,
            SupplierId        = supplier.Id,
            QuantityPurchased = 10m,
            TotalPrice        = 1000m,
            PricePerUnit      = 100m,
        });
        // Compra de otro tenant
        Db.SupplyPurchases.Add(new SupplyPurchase
        {
            TenantId          = "otro-tenant",
            SupplyId          = supply.Id,
            SupplierId        = supplier.Id,
            QuantityPurchased = 5m,
            TotalPrice        = 500m,
            PricePerUnit      = 100m,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetPurchases();

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SupplyPurchaseDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal(1000m, list[0].TotalPrice);
    }

    // ── CreatePurchase ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreatePurchase_ValidData_CreatesAndUpdatesStockAndDebt()
    {
        var supplier = await CreateSupplierAsync(TenantId, "Proveedor Compra");
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "Arroz");
        supply.CurrentStock = 0m;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.CreatePurchase(new CreateSupplyPurchaseRequest
        {
            SupplyId          = supply.Id,
            SupplierId        = supplier.Id,
            QuantityPurchased = 20m,
            TotalPrice        = 2000m,
        });

        var created = Assert.IsType<CreatedResult>(result.Result);
        var dto     = Assert.IsType<SupplyPurchaseDto>(created.Value);
        Assert.Equal(20m,   dto.QuantityPurchased);
        Assert.Equal(2000m, dto.TotalPrice);
        Assert.Equal(100m,  dto.PricePerUnit); // 2000/20

        // Stock actualizado
        var updatedSupply = await Db.Supplies.FindAsync(supply.Id);
        Assert.Equal(20m, updatedSupply!.CurrentStock);

        // Deuda del proveedor
        var updatedSupplier = await Db.Suppliers.FindAsync(supplier.Id);
        Assert.Equal(2000m, updatedSupplier!.TotalDebt);

        // Movimiento de inventario
        var movement = Db.InventoryMovements.FirstOrDefault(m => m.SupplyId == supply.Id);
        Assert.NotNull(movement);
        Assert.Equal(20m, movement.QuantityChange);
        Assert.Equal("Purchase", movement.Reason);
    }

    [Fact]
    public async Task CreatePurchase_NonExistentSupply_ReturnsBadRequest()
    {
        var supplier = await CreateSupplierAsync(TenantId);

        var ctrl   = CreateController();
        var result = await ctrl.CreatePurchase(new CreateSupplyPurchaseRequest
        {
            SupplyId          = "nonexistent-supply",
            SupplierId        = supplier.Id,
            QuantityPurchased = 10m,
            TotalPrice        = 100m,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreatePurchase_NoSupplierId_ReturnsBadRequest()
    {
        var supply = await CreateSupplyAsync(TenantId);

        var ctrl   = CreateController();
        var result = await ctrl.CreatePurchase(new CreateSupplyPurchaseRequest
        {
            SupplyId          = supply.Id,
            SupplierId        = null,
            QuantityPurchased = 10m,
            TotalPrice        = 100m,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // ── GetMovements ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMovements_ValidSupply_ReturnsMovements()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id);

        Db.InventoryMovements.Add(new InventoryMovement
        {
            TenantId       = TenantId,
            SupplyId       = supply.Id,
            QuantityChange = 10m,
            Reason         = "Purchase",
        });
        Db.InventoryMovements.Add(new InventoryMovement
        {
            TenantId       = TenantId,
            SupplyId       = supply.Id,
            QuantityChange = -5m,
            Reason         = "OrderDeducted",
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetMovements(supply.Id);

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<InventoryMovementDto>>(ok.Value);
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task GetMovements_SupplyNotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetMovements("nonexistent");

        Assert.IsType<NotFoundResult>(result.Result);
    }
}
