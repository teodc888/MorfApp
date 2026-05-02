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
public class OrdersController(IAppDbContext db) : ControllerBase
{
    private string TenantId => User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException();

    // GET /api/admin/orders
    // Devuelve pedidos pendientes del tenant, ordenados por fecha desc.
    // Query param opcional ?status=pending|confirmed (default: pending)
    [HttpGet]
    public async Task<ActionResult<List<OrderAdminDto>>> GetOrders([FromQuery] string status = "pending")
    {
        if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var orderStatus))
            return BadRequest(new { message = "Estado inválido. Usar 'pending' o 'confirmed'." });

        var orders = await db.Orders
            .Where(o => o.TenantId == TenantId && o.Status == orderStatus)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return Ok(orders.Select(MapOrder).ToList());
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
        await db.SaveChangesAsync();

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
