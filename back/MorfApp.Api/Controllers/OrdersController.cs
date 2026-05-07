using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.Security.Claims;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize]
public class OrdersController(
    IAppDbContext db,
    MorfApp.Api.WebSocket.WebSocketConnectionManager wsManager) : ControllerBase
{
    private string TenantId => User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException();

    // GET /api/admin/orders
    // Devuelve pedidos del tenant con paginación y búsqueda opcional.
    // Query params:
    //   ?status=pending|confirmed|cancelled (default: pending)
    //   ?q=search_term (busca en nombre o teléfono del cliente)
    //   ?limit=10 (cantidad de resultados, default: 10)
    //   ?offset=0 (offset de paginación, default: 0)
    [HttpGet]
    public async Task<ActionResult<object>> GetOrders(
        [FromQuery] string status = "pending",
        [FromQuery] string? q = null,
        [FromQuery] int limit = 10,
        [FromQuery] int offset = 0)
    {
        if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var orderStatus))
            return BadRequest(new { message = "Estado inválido. Usar 'pending', 'confirmed' o 'cancelled'." });

        var query = db.Orders
            .Where(o => o.TenantId == TenantId && o.Status == orderStatus);

        // Aplicar búsqueda si se proporciona
        if (!string.IsNullOrWhiteSpace(q))
        {
            var searchTerm = q.ToLower();
            query = query.Where(o =>
                o.CustomerName != null && o.CustomerName.ToLower().Contains(searchTerm) ||
                o.CustomerPhone.ToLower().Contains(searchTerm)
            );
        }

        var total = await query.CountAsync();

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            items = orders.Select(MapOrder).ToList(),
            total,
            limit,
            offset
        });
    }

    // POST /api/admin/orders/{id}/confirm
    // Confirma un pedido pendiente del tenant.
    [HttpPost("{id}/confirm")]
    public async Task<ActionResult<OrderAdminDto>> ConfirmOrder(string id)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == TenantId);

        if (order is null)
            return NotFound(new { message = "Pedido no encontrado." });

        if (order.Status == OrderStatus.Confirmed)
            return BadRequest(new { message = "El pedido ya fue confirmado." });

        order.Status = OrderStatus.Confirmed;
        order.ConfirmedAt = DateTime.UtcNow;

        // Descontar inventario según los insumos asociados a cada producto
        foreach (var item in order.Items)
        {
            var productSupplies = await db.ProductSupplies
                .Where(ps => ps.ProductId == item.ProductId && ps.TenantId == TenantId && !ps.IsUnknownQuantity)
                .ToListAsync();

            foreach (var ps in productSupplies)
            {
                var supply = await db.Supplies.FirstOrDefaultAsync(s => s.Id == ps.SupplyId);
                if (supply is null) continue;

                var delta = ps.QuantityRequired * item.Quantity;
                supply.CurrentStock -= delta;
                supply.UpdatedAt = DateTime.UtcNow;

                db.InventoryMovements.Add(new InventoryMovement
                {
                    TenantId = TenantId,
                    SupplyId = ps.SupplyId,
                    QuantityChange = -delta,
                    Reason = "OrderDeducted",
                    ReferenceId = order.Id
                });
            }
        }

        await db.SaveChangesAsync();

        return Ok(MapOrder(order));
    }

    // POST /api/admin/orders/{id}/cancel
    // Cancela un pedido pendiente del tenant.
    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<OrderAdminDto>> CancelOrder(string id)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == TenantId);

        if (order is null)
            return NotFound(new { message = "Pedido no encontrado." });

        if (order.Status == OrderStatus.Cancelled)
            return BadRequest(new { message = "El pedido ya fue cancelado." });

        order.Status = OrderStatus.Cancelled;
        await db.SaveChangesAsync();

        // Emitir evento WebSocket
        await wsManager.BroadcastToTenantAsync(TenantId, new MorfApp.Api.WebSocket.WebSocketEvent
        {
            Type = "order_cancelled",
            Data = new { orderId = order.Id, status = order.Status.ToString().ToLower() }
        });

        return Ok(MapOrder(order));
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private static OrderAdminDto MapOrder(Order o) => new(
        o.Id,
        o.CustomerName,
        o.CustomerPhone,
        o.Items.Select(i => new OrderItemDto(
            i.ProductId,
            i.ProductName,
            i.Quantity,
            i.UnitPrice,
            i.Modifiers.Select(m => new OrderItemModifierDto(
                m.OptionId,
                m.OptionName,
                m.ExtraPrice
            )).ToList()
        )).ToList(),
        o.TotalPrice,
        o.DeliveryMode,
        o.Address,
        o.Notes,
        o.PaymentMethod,
        o.Status.ToString().ToLower(),
        o.CreatedAt,
        o.ConfirmedAt
    );
}
