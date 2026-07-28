using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using System.Security.Claims;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/admin/suppliers")]
[Authorize(Policy = "OwnerOnly")]
public class SupplierController(IAppDbContext db) : ControllerBase
{
    private string TenantId => User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException();

    [HttpGet]
    public async Task<ActionResult<List<SupplierDto>>> GetSuppliers()
    {
        var suppliers = await db.Suppliers
            .Where(s => s.TenantId == TenantId && s.IsActive)
            .OrderBy(s => s.Name)
            .Select(s => MapSupplier(s))
            .ToListAsync();
        return Ok(suppliers);
    }

    [HttpPost]
    public async Task<ActionResult<SupplierDto>> CreateSupplier([FromBody] CreateSupplierRequest req)
    {
        var supplier = new Supplier
        {
            TenantId = TenantId,
            Name = req.Name.Trim(),
            Phone = req.Phone?.Trim(),
            Address = req.Address?.Trim(),
            Notes = req.Notes?.Trim()
        };
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return Created($"api/admin/suppliers/{supplier.Id}", MapSupplier(supplier));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SupplierDto>> UpdateSupplier(string id, [FromBody] UpdateSupplierRequest req)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supplier is null) return NotFound();
        supplier.Name = req.Name.Trim();
        supplier.Phone = req.Phone?.Trim();
        supplier.Address = req.Address?.Trim();
        supplier.Notes = req.Notes?.Trim();
        supplier.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapSupplier(supplier));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSupplier(string id)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supplier is null) return NotFound();

        // Cascade soft-delete to all active supplies of this supplier
        var supplies = await db.Supplies
            .Where(s => s.SupplierId == id && s.TenantId == TenantId && s.IsActive)
            .ToListAsync();
        foreach (var supply in supplies)
        {
            supply.IsActive = false;
            supply.UpdatedAt = DateTime.UtcNow;
        }

        supplier.IsActive = false;
        supplier.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id}/restore")]
    public async Task<IActionResult> RestoreSupplier(string id)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supplier is null) return NotFound();

        // Cascade restore to all supplies of this supplier
        var supplies = await db.Supplies
            .Where(s => s.SupplierId == id && s.TenantId == TenantId && !s.IsActive)
            .ToListAsync();
        foreach (var supply in supplies)
        {
            supply.IsActive = true;
            supply.UpdatedAt = DateTime.UtcNow;
        }

        supplier.IsActive = true;
        supplier.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("inactive")]
    public async Task<ActionResult<List<SupplierDto>>> GetInactiveSuppliers()
    {
        var suppliers = await db.Suppliers
            .Where(s => s.TenantId == TenantId && !s.IsActive)
            .OrderBy(s => s.Name)
            .Select(s => MapSupplier(s))
            .ToListAsync();
        return Ok(suppliers);
    }

    [HttpGet("{id}/debt-detail")]
    public async Task<ActionResult<SupplierDebtDetailDto>> GetDebtDetail(string id)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supplier is null) return NotFound();

        return Ok(await BuildDebtDetail(supplier));
    }

    [HttpGet("{id}/payments")]
    public async Task<ActionResult<List<SupplierPaymentDto>>> GetPayments(string id)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supplier is null) return NotFound();

        var payments = await BuildPaymentDtos(supplier);
        return Ok(payments);
    }

    [HttpPost("{id}/purchases/{purchaseId}/pay-partial")]
    public async Task<ActionResult<SupplierDebtDetailDto>> PayPurchasePartial(
        string id,
        string purchaseId,
        [FromBody] CreateSupplierPurchasePaymentRequest req)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supplier is null) return NotFound();

        var purchase = await db.SupplyPurchases.FirstOrDefaultAsync(p =>
            p.Id == purchaseId && p.SupplierId == id && p.TenantId == TenantId);
        if (purchase is null) return NotFound();

        var pending = await GetPurchasePendingAmount(purchase.Id, purchase.TotalPrice);
        if (pending <= 0) return BadRequest(new { message = "La compra ya está pagada." });
        if (req.Amount <= 0 || req.Amount > pending)
            return BadRequest(new { message = "El monto debe ser mayor a 0 y no superar el pendiente de la compra." });

        AddPayment(supplier, [(purchase.Id, req.Amount)], req.Notes);
        await db.SaveChangesAsync();
        await RecalculateSupplierDebt(supplier);
        await db.SaveChangesAsync();

        return Ok(await BuildDebtDetail(supplier));
    }

    [HttpPost("{id}/purchases/{purchaseId}/pay-full")]
    public async Task<ActionResult<SupplierDebtDetailDto>> PayPurchaseFull(string id, string purchaseId)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supplier is null) return NotFound();

        var purchase = await db.SupplyPurchases.FirstOrDefaultAsync(p =>
            p.Id == purchaseId && p.SupplierId == id && p.TenantId == TenantId);
        if (purchase is null) return NotFound();

        var pending = await GetPurchasePendingAmount(purchase.Id, purchase.TotalPrice);
        if (pending <= 0) return BadRequest(new { message = "La compra ya está pagada." });

        AddPayment(supplier, [(purchase.Id, pending)], "Pago completo de compra");
        await db.SaveChangesAsync();
        await RecalculateSupplierDebt(supplier);
        await db.SaveChangesAsync();

        return Ok(await BuildDebtDetail(supplier));
    }

    [HttpPost("{id}/pay-all")]
    public async Task<ActionResult<SupplierDebtDetailDto>> PayAllDebt(string id)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supplier is null) return NotFound();

        var purchases = await db.SupplyPurchases
            .Where(p => p.SupplierId == id && p.TenantId == TenantId)
            .OrderBy(p => p.PurchaseDate)
            .ToListAsync();
        var allocations = new List<(string PurchaseId, decimal Amount)>();

        foreach (var purchase in purchases)
        {
            var pending = await GetPurchasePendingAmount(purchase.Id, purchase.TotalPrice);
            if (pending > 0) allocations.Add((purchase.Id, pending));
        }

        if (allocations.Count == 0) return BadRequest(new { message = "El proveedor no tiene deuda pendiente." });

        AddPayment(supplier, allocations, "Pago total de deuda del proveedor");
        await db.SaveChangesAsync();
        await RecalculateSupplierDebt(supplier);
        await db.SaveChangesAsync();

        return Ok(await BuildDebtDetail(supplier));
    }

    private static SupplierDto MapSupplier(Supplier s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Phone = s.Phone,
        Address = s.Address,
        Notes = s.Notes,
        TotalDebt = s.TotalDebt,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt
    };

    private async Task<SupplierDebtDetailDto> BuildDebtDetail(Supplier supplier)
    {
        var purchases = await db.SupplyPurchases
            .Where(p => p.SupplierId == supplier.Id && p.TenantId == TenantId)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();
        var supplyIds = purchases.Select(p => p.SupplyId).Distinct().ToList();
        var purchaseIds = purchases.Select(p => p.Id).ToList();

        var supplies = await db.Supplies
            .Where(s => supplyIds.Contains(s.Id) && s.TenantId == TenantId)
            .ToDictionaryAsync(s => s.Id, s => s.Name);
        var allocations = await db.SupplierPaymentAllocations
            .Where(a => a.TenantId == TenantId && purchaseIds.Contains(a.SupplyPurchaseId))
            .ToListAsync();

        var purchaseDtos = purchases.Select(p =>
        {
            var purchaseAllocations = allocations.Where(a => a.SupplyPurchaseId == p.Id).ToList();
            var paid = purchaseAllocations.Sum(a => a.Amount);
            var pending = Math.Max(0, p.TotalPrice - paid);
            return new SupplierDebtPurchaseDto
            {
                PurchaseId = p.Id,
                SupplyId = p.SupplyId,
                SupplyName = supplies.TryGetValue(p.SupplyId, out var name) ? name : "",
                TotalPrice = p.TotalPrice,
                PaidAmount = paid,
                PendingAmount = pending,
                Status = pending <= 0 ? "paid" : paid > 0 ? "partial" : "pending",
                PurchaseDate = p.PurchaseDate,
                Allocations = purchaseAllocations.Select(a => new SupplierPaymentAllocationDto
                {
                    PaymentId = a.SupplierPaymentId,
                    PurchaseId = a.SupplyPurchaseId,
                    SupplyName = supplies.TryGetValue(p.SupplyId, out var supplyName) ? supplyName : "",
                    Amount = a.Amount
                }).ToList()
            };
        }).ToList();

        return new SupplierDebtDetailDto
        {
            SupplierId = supplier.Id,
            SupplierName = supplier.Name,
            TotalDebt = purchaseDtos.Sum(p => p.PendingAmount),
            Purchases = purchaseDtos,
            Payments = await BuildPaymentDtos(supplier)
        };
    }

    private async Task<List<SupplierPaymentDto>> BuildPaymentDtos(Supplier supplier)
    {
        var payments = await db.SupplierPayments
            .Where(p => p.SupplierId == supplier.Id && p.TenantId == TenantId)
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();
        var paymentIds = payments.Select(p => p.Id).ToList();
        var allocations = await db.SupplierPaymentAllocations
            .Where(a => a.TenantId == TenantId && paymentIds.Contains(a.SupplierPaymentId))
            .ToListAsync();
        var purchaseIds = allocations.Select(a => a.SupplyPurchaseId).Distinct().ToList();
        var purchases = await db.SupplyPurchases
            .Where(p => p.TenantId == TenantId && purchaseIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);
        var supplyIds = purchases.Values.Select(p => p.SupplyId).Distinct().ToList();
        var supplies = await db.Supplies
            .Where(s => s.TenantId == TenantId && supplyIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Name);

        return payments.Select(payment => new SupplierPaymentDto
        {
            Id = payment.Id,
            SupplierId = supplier.Id,
            SupplierName = supplier.Name,
            Amount = payment.Amount,
            Notes = payment.Notes,
            PaidAt = payment.PaidAt,
            Allocations = allocations
                .Where(a => a.SupplierPaymentId == payment.Id)
                .Select(a => new SupplierPaymentAllocationDto
                {
                    PaymentId = a.SupplierPaymentId,
                    PurchaseId = a.SupplyPurchaseId,
                    SupplyName = purchases.TryGetValue(a.SupplyPurchaseId, out var purchase) && supplies.TryGetValue(purchase.SupplyId, out var supplyName) ? supplyName : "",
                    Amount = a.Amount
                }).ToList()
        }).ToList();
    }

    private async Task<decimal> GetPurchasePendingAmount(string purchaseId, decimal totalPrice)
    {
        var paid = await db.SupplierPaymentAllocations
            .Where(a => a.TenantId == TenantId && a.SupplyPurchaseId == purchaseId)
            .SumAsync(a => a.Amount);
        return Math.Max(0, totalPrice - paid);
    }

    private void AddPayment(Supplier supplier, List<(string PurchaseId, decimal Amount)> allocations, string? notes)
    {
        var amount = allocations.Sum(a => a.Amount);
        var payment = new SupplierPayment
        {
            TenantId = TenantId,
            SupplierId = supplier.Id,
            Amount = amount,
            Notes = notes?.Trim()
        };
        db.SupplierPayments.Add(payment);

        foreach (var allocation in allocations)
        {
            db.SupplierPaymentAllocations.Add(new SupplierPaymentAllocation
            {
                TenantId = TenantId,
                SupplierPaymentId = payment.Id,
                SupplyPurchaseId = allocation.PurchaseId,
                Amount = allocation.Amount
            });
        }
    }

    private async Task RecalculateSupplierDebt(Supplier supplier)
    {
        var purchases = await db.SupplyPurchases
            .Where(p => p.SupplierId == supplier.Id && p.TenantId == TenantId)
            .ToListAsync();
        var purchaseIds = purchases.Select(p => p.Id).ToList();
        var paid = await db.SupplierPaymentAllocations
            .Where(a => a.TenantId == TenantId && purchaseIds.Contains(a.SupplyPurchaseId))
            .SumAsync(a => a.Amount);
        supplier.TotalDebt = Math.Max(0, purchases.Sum(p => p.TotalPrice) - paid);
        supplier.UpdatedAt = DateTime.UtcNow;
    }
}
