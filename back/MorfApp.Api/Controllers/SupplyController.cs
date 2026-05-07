using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using System.Security.Claims;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/admin/supplies")]
[Authorize]
public class SupplyController(IAppDbContext db) : ControllerBase
{
    private string TenantId => User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException();

    // GET /api/admin/supplies
    [HttpGet]
    public async Task<ActionResult<List<SupplyDto>>> GetSupplies()
    {
        var supplies = await db.Supplies
            .Where(s => s.TenantId == TenantId && s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync();

        var supplierIds = supplies
            .Where(s => s.SupplierId != null)
            .Select(s => s.SupplierId!)
            .Distinct()
            .ToList();

        var suppliers = await db.Suppliers
            .Where(s => s.TenantId == TenantId && supplierIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Name);

        var result = supplies.Select(s => new SupplyDto
        {
            Id = s.Id,
            Name = s.Name,
            Unit = s.Unit,
            CurrentStock = s.CurrentStock,
            SupplierId = s.SupplierId,
            SupplierName = s.SupplierId != null && suppliers.TryGetValue(s.SupplierId, out var sName) ? sName : null,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt
        }).ToList();

        return Ok(result);
    }

    // POST /api/admin/supplies
    [HttpPost]
    public async Task<ActionResult<SupplyDto>> CreateSupply([FromBody] CreateSupplyRequest req)
    {
        // Validar proveedor si se especifica
        if (string.IsNullOrWhiteSpace(req.SupplierId))
            return BadRequest(new { message = "El proveedor es obligatorio." });

        var supplier = await db.Suppliers
            .FirstOrDefaultAsync(s => s.Id == req.SupplierId && s.TenantId == TenantId && s.IsActive);
        if (supplier is null)
            return BadRequest(new { message = "El proveedor especificado no existe." });

        var supply = new Supply
        {
            TenantId = TenantId,
            Name = req.Name.Trim(),
            Unit = req.Unit?.Trim(),
            SupplierId = req.SupplierId
        };
        db.Supplies.Add(supply);
        await db.SaveChangesAsync();

        string? supplierName = null;
        if (supply.SupplierId != null)
        {
            var sup = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == supply.SupplierId && s.TenantId == TenantId);
            supplierName = sup?.Name;
        }

        return Created($"api/admin/supplies/{supply.Id}", new SupplyDto
        {
            Id = supply.Id,
            Name = supply.Name,
            Unit = supply.Unit,
            CurrentStock = supply.CurrentStock,
            SupplierId = supply.SupplierId,
            SupplierName = supplierName,
            IsActive = supply.IsActive,
            CreatedAt = supply.CreatedAt
        });
    }

    // PUT /api/admin/supplies/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<SupplyDto>> UpdateSupply(string id, [FromBody] UpdateSupplyRequest req)
    {
        var supply = await db.Supplies.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supply is null) return NotFound();

        // Validar proveedor si se especifica
        if (string.IsNullOrWhiteSpace(req.SupplierId))
            return BadRequest(new { message = "El proveedor es obligatorio." });

        var supplier = await db.Suppliers
            .FirstOrDefaultAsync(s => s.Id == req.SupplierId && s.TenantId == TenantId && s.IsActive);
        if (supplier is null)
            return BadRequest(new { message = "El proveedor especificado no existe." });

        supply.Name = req.Name.Trim();
        supply.Unit = req.Unit?.Trim();
        supply.SupplierId = req.SupplierId;
        supply.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        string? supplierName = null;
        if (supply.SupplierId != null)
        {
            var sup = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == supply.SupplierId && s.TenantId == TenantId);
            supplierName = sup?.Name;
        }

        return Ok(new SupplyDto
        {
            Id = supply.Id,
            Name = supply.Name,
            Unit = supply.Unit,
            CurrentStock = supply.CurrentStock,
            SupplierId = supply.SupplierId,
            SupplierName = supplierName,
            IsActive = supply.IsActive,
            CreatedAt = supply.CreatedAt
        });
    }

    // DELETE /api/admin/supplies/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSupply(string id)
    {
        var supply = await db.Supplies.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supply is null) return NotFound();

        var inUse = await db.ProductSupplies
            .AnyAsync(ps => ps.SupplyId == id && ps.TenantId == TenantId);
        if (inUse)
            return BadRequest(new { message = "No se puede eliminar un insumo que está siendo utilizado por productos." });

        supply.IsActive = false;
        supply.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/admin/supplies/{id}/reset
    [HttpPost("{id}/reset")]
    public async Task<IActionResult> ResetStock(string id)
    {
        var supply = await db.Supplies.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supply is null) return NotFound();

        var previousStock = supply.CurrentStock;
        supply.CurrentStock = 0;
        supply.UpdatedAt = DateTime.UtcNow;

        db.InventoryMovements.Add(new InventoryMovement
        {
            TenantId = TenantId,
            SupplyId = supply.Id,
            QuantityChange = -previousStock,
            Reason = "ManualReset"
        });

        await db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/admin/supplies/purchases
    [HttpGet("purchases")]
    public async Task<ActionResult<List<SupplyPurchaseDto>>> GetPurchases()
    {
        var purchases = await db.SupplyPurchases
            .Where(p => p.TenantId == TenantId)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();

        var supplyIds = purchases.Select(p => p.SupplyId).Distinct().ToList();
        var supplierIds = purchases.Where(p => p.SupplierId != null).Select(p => p.SupplierId!).Distinct().ToList();

        var supplies = await db.Supplies
            .Where(s => s.TenantId == TenantId && supplyIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Name);

        var suppliers = await db.Suppliers
            .Where(s => s.TenantId == TenantId && supplierIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Name);

        var result = purchases.Select(p => new SupplyPurchaseDto
        {
            Id = p.Id,
            SupplyId = p.SupplyId,
            SupplyName = supplies.TryGetValue(p.SupplyId, out var sName) ? sName : "",
            SupplierId = p.SupplierId,
            SupplierName = p.SupplierId != null && suppliers.TryGetValue(p.SupplierId, out var supName) ? supName : null,
            QuantityPurchased = p.QuantityPurchased,
            TotalPrice = p.TotalPrice,
            PricePerUnit = p.PricePerUnit,
            Notes = p.Notes,
            PurchaseDate = p.PurchaseDate
        }).ToList();

        return Ok(result);
    }

    // POST /api/admin/supplies/purchases
    [HttpPost("purchases")]
    public async Task<ActionResult<SupplyPurchaseDto>> CreatePurchase([FromBody] CreateSupplyPurchaseRequest req)
    {
        var supply = await db.Supplies.FirstOrDefaultAsync(s => s.Id == req.SupplyId && s.TenantId == TenantId);
        if (supply is null)
            return BadRequest(new { message = "El insumo especificado no existe." });

        if (string.IsNullOrWhiteSpace(req.SupplierId))
            return BadRequest(new { message = "El proveedor es obligatorio." });

        var supplier = await db.Suppliers
            .FirstOrDefaultAsync(s => s.Id == req.SupplierId && s.TenantId == TenantId && s.IsActive);
        if (supplier is null)
            return BadRequest(new { message = "El proveedor especificado no existe." });

        var pricePerUnit = req.TotalPrice / req.QuantityPurchased;

        var purchase = new SupplyPurchase
        {
            TenantId = TenantId,
            SupplyId = req.SupplyId,
            SupplierId = req.SupplierId,
            QuantityPurchased = req.QuantityPurchased,
            TotalPrice = req.TotalPrice,
            PricePerUnit = pricePerUnit,
            Notes = req.Notes?.Trim()
        };
        db.SupplyPurchases.Add(purchase);

        // Sumar al stock
        supply.CurrentStock += req.QuantityPurchased;
        supply.UpdatedAt = DateTime.UtcNow;

        supplier.TotalDebt += req.TotalPrice;
        supplier.UpdatedAt = DateTime.UtcNow;

        // Crear movimiento de inventario
        db.InventoryMovements.Add(new InventoryMovement
        {
            TenantId = TenantId,
            SupplyId = supply.Id,
            QuantityChange = req.QuantityPurchased,
            Reason = "Purchase",
            ReferenceId = purchase.Id
        });

        await db.SaveChangesAsync();

        return Created($"api/admin/supplies/purchases/{purchase.Id}", new SupplyPurchaseDto
        {
            Id = purchase.Id,
            SupplyId = purchase.SupplyId,
            SupplyName = supply.Name,
            SupplierId = purchase.SupplierId,
            SupplierName = supplier.Name,
            QuantityPurchased = purchase.QuantityPurchased,
            TotalPrice = purchase.TotalPrice,
            PricePerUnit = purchase.PricePerUnit,
            Notes = purchase.Notes,
            PurchaseDate = purchase.PurchaseDate
        });
    }

    // GET /api/admin/supplies/{id}/movements
    [HttpGet("{id}/movements")]
    public async Task<ActionResult<List<InventoryMovementDto>>> GetMovements(string id)
    {
        var supply = await db.Supplies.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == TenantId);
        if (supply is null) return NotFound();

        var movements = await db.InventoryMovements
            .Where(m => m.SupplyId == id && m.TenantId == TenantId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

        var result = movements.Select(m => new InventoryMovementDto
        {
            Id = m.Id,
            SupplyId = m.SupplyId,
            SupplyName = supply.Name,
            QuantityChange = m.QuantityChange,
            Reason = m.Reason,
            ReferenceId = m.ReferenceId,
            CreatedAt = m.CreatedAt
        }).ToList();

        return Ok(result);
    }
}
