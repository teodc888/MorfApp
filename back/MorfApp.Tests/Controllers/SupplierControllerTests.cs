using Microsoft.AspNetCore.Mvc;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Domain.Entities;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class SupplierControllerTests : TestBase
{
    private SupplierController CreateController()
    {
        var ctrl = new SupplierController(Db);
        SetupTenantClaims(ctrl, TenantId);
        return ctrl;
    }

    // ── GetSuppliers ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSuppliers_ReturnsOnlyActiveOnesFromTenant()
    {
        await CreateTenantAsync();
        await CreateSupplierAsync(TenantId, "Activo 1");
        await CreateSupplierAsync(TenantId, "Activo 2");

        // Inactivo en mismo tenant
        Db.Suppliers.Add(new Supplier { TenantId = TenantId, Name = "Inactivo", IsActive = false });
        // Activo pero de otro tenant
        Db.Suppliers.Add(new Supplier { TenantId = "otro", Name = "Otro tenant", IsActive = true });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetSuppliers();

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SupplierDto>>(ok.Value);
        Assert.Equal(2, list.Count);
        Assert.All(list, s => Assert.True(s.IsActive));
    }

    // ── CreateSupplier ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateSupplier_ValidData_ReturnsCreated()
    {
        var ctrl   = CreateController();
        var result = await ctrl.CreateSupplier(new CreateSupplierRequest
        {
            Name    = "  Distribuidora Sur  ",
            Phone   = "011-4455-6677",
            Address = "Av. Siempreviva 742",
            Notes   = "Entrega los martes",
        });

        var created = Assert.IsType<CreatedResult>(result.Result);
        var dto     = Assert.IsType<SupplierDto>(created.Value);
        Assert.Equal("Distribuidora Sur", dto.Name); // trimmed
        Assert.Equal("011-4455-6677", dto.Phone);
    }

    [Fact]
    public async Task CreateSupplier_TrimpsWhitespace()
    {
        var ctrl   = CreateController();
        await ctrl.CreateSupplier(new CreateSupplierRequest { Name = "  Con Espacios  " });

        var supplier = Db.Suppliers.First(s => s.TenantId == TenantId);
        Assert.Equal("Con Espacios", supplier.Name);
    }

    // ── UpdateSupplier ────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateSupplier_Exists_ReturnsOkWithUpdatedData()
    {
        var supplier = await CreateSupplierAsync(TenantId, "Original");

        var ctrl   = CreateController();
        var result = await ctrl.UpdateSupplier(supplier.Id, new UpdateSupplierRequest
        {
            Name    = "Actualizado",
            Phone   = "1122334455",
            Address = "Nueva Dirección",
        });

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SupplierDto>(ok.Value);
        Assert.Equal("Actualizado", dto.Name);
        Assert.Equal("1122334455",  dto.Phone);
    }

    [Fact]
    public async Task UpdateSupplier_BelongsToOtherTenant_ReturnsNotFound()
    {
        var supplier = new Supplier { TenantId = "otro-tenant", Name = "Ajeno", IsActive = true };
        Db.Suppliers.Add(supplier);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.UpdateSupplier(supplier.Id, new UpdateSupplierRequest { Name = "Hack" });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateSupplier_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.UpdateSupplier("nonexistent-id", new UpdateSupplierRequest { Name = "Test" });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ── DeleteSupplier ────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteSupplier_Exists_SoftDeletesAndReturnsNoContent()
    {
        var supplier = await CreateSupplierAsync(TenantId, "Para Borrar");

        var ctrl   = CreateController();
        var result = await ctrl.DeleteSupplier(supplier.Id);

        Assert.IsType<NoContentResult>(result);
        var deleted = await Db.Suppliers.FindAsync(supplier.Id);
        Assert.False(deleted!.IsActive); // soft delete
    }

    [Fact]
    public async Task DeleteSupplier_CascadeSoftDeletesSupplies()
    {
        var supplier = await CreateSupplierAsync(TenantId, "Con Insumos");
        var supply1  = await CreateSupplyAsync(TenantId, supplier.Id, "Harina");
        var supply2  = await CreateSupplyAsync(TenantId, supplier.Id, "Azúcar");

        var ctrl   = CreateController();
        await ctrl.DeleteSupplier(supplier.Id);

        var s1 = await Db.Supplies.FindAsync(supply1.Id);
        var s2 = await Db.Supplies.FindAsync(supply2.Id);
        Assert.False(s1!.IsActive);
        Assert.False(s2!.IsActive);
    }

    [Fact]
    public async Task DeleteSupplier_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.DeleteSupplier("nonexistent-supplier");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── RestoreSupplier ───────────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreSupplier_Inactive_RestoresAndReturnsNoContent()
    {
        var supplier = new Supplier { TenantId = TenantId, Name = "Inactivo", IsActive = false };
        Db.Suppliers.Add(supplier);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.RestoreSupplier(supplier.Id);

        Assert.IsType<NoContentResult>(result);
        var restored = await Db.Suppliers.FindAsync(supplier.Id);
        Assert.True(restored!.IsActive);
    }

    [Fact]
    public async Task RestoreSupplier_CascadeRestoresSupplies()
    {
        var supplier = new Supplier { TenantId = TenantId, Name = "Inactivo", IsActive = false };
        Db.Suppliers.Add(supplier);
        var supply = new Supply { TenantId = TenantId, SupplierId = supplier.Id, Name = "Harina", IsActive = false };
        Db.Supplies.Add(supply);
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        await ctrl.RestoreSupplier(supplier.Id);

        var restoredSupply = await Db.Supplies.FindAsync(supply.Id);
        Assert.True(restoredSupply!.IsActive);
    }

    // ── GetInactiveSuppliers ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetInactiveSuppliers_ReturnsOnlyInactiveOnesFromTenant()
    {
        await CreateSupplierAsync(TenantId, "Activo");
        var inactive = new Supplier { TenantId = TenantId, Name = "Inactivo", IsActive = false };
        Db.Suppliers.Add(inactive);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.GetInactiveSuppliers();

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SupplierDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal("Inactivo", list[0].Name);
    }

    // ── GetDebtDetail ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetDebtDetail_ValidSupplier_ReturnsDebtDetail()
    {
        var supplier = await CreateSupplierAsync(TenantId);

        var ctrl   = CreateController();
        var result = await ctrl.GetDebtDetail(supplier.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SupplierDebtDetailDto>(ok.Value);
        Assert.Equal(supplier.Id, dto.SupplierId);
        Assert.Equal(0m, dto.TotalDebt);
    }

    [Fact]
    public async Task GetDebtDetail_SupplierNotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController();
        var result = await ctrl.GetDebtDetail("nonexistent");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ── PayAllDebt ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PayAllDebt_NoDebt_ReturnsBadRequest()
    {
        var supplier = await CreateSupplierAsync(TenantId);

        var ctrl   = CreateController();
        var result = await ctrl.PayAllDebt(supplier.Id);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task PayAllDebt_WithDebt_PaysAndReturnsUpdatedDetail()
    {
        var supplier = await CreateSupplierAsync(TenantId, "Deudor");
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id, "Harina");

        // Crear una compra que genera deuda
        var purchase = new SupplyPurchase
        {
            TenantId          = TenantId,
            SupplyId          = supply.Id,
            SupplierId        = supplier.Id,
            QuantityPurchased = 10m,
            TotalPrice        = 1000m,
            PricePerUnit      = 100m,
        };
        Db.SupplyPurchases.Add(purchase);
        supplier.TotalDebt = 1000m;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.PayAllDebt(supplier.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SupplierDebtDetailDto>(ok.Value);
        Assert.Equal(0m, dto.TotalDebt);
    }

    // ── PayPurchasePartial ─────────────────────────────────────────────────────────

    [Fact]
    public async Task PayPurchasePartial_ValidAmount_ReturnsUpdatedDebt()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id);
        var purchase = new SupplyPurchase
        {
            TenantId          = TenantId,
            SupplyId          = supply.Id,
            SupplierId        = supplier.Id,
            QuantityPurchased = 5m,
            TotalPrice        = 500m,
            PricePerUnit      = 100m,
        };
        Db.SupplyPurchases.Add(purchase);
        supplier.TotalDebt = 500m;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.PayPurchasePartial(supplier.Id, purchase.Id,
            new CreateSupplierPurchasePaymentRequest { Amount = 200m });

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SupplierDebtDetailDto>(ok.Value);
        // Deuda restante = 500 - 200 = 300
        Assert.Equal(300m, dto.TotalDebt);
    }

    [Fact]
    public async Task PayPurchasePartial_ZeroAmount_ReturnsBadRequest()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id);
        var purchase = new SupplyPurchase
        {
            TenantId          = TenantId,
            SupplyId          = supply.Id,
            SupplierId        = supplier.Id,
            QuantityPurchased = 5m,
            TotalPrice        = 500m,
            PricePerUnit      = 100m,
        };
        Db.SupplyPurchases.Add(purchase);
        supplier.TotalDebt = 500m;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.PayPurchasePartial(supplier.Id, purchase.Id,
            new CreateSupplierPurchasePaymentRequest { Amount = 0m });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task PayPurchasePartial_AmountExceedsPending_ReturnsBadRequest()
    {
        var supplier = await CreateSupplierAsync(TenantId);
        var supply   = await CreateSupplyAsync(TenantId, supplier.Id);
        var purchase = new SupplyPurchase
        {
            TenantId          = TenantId,
            SupplyId          = supply.Id,
            SupplierId        = supplier.Id,
            QuantityPurchased = 5m,
            TotalPrice        = 500m,
            PricePerUnit      = 100m,
        };
        Db.SupplyPurchases.Add(purchase);
        supplier.TotalDebt = 500m;
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.PayPurchasePartial(supplier.Id, purchase.Id,
            new CreateSupplierPurchasePaymentRequest { Amount = 9999m });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
