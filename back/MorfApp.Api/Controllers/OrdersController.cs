using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.Globalization;
using System.Security.Claims;
using System.Text;

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
    //   ?status=pending|confirmed|cancelled (default: pending) — un único estado
    //   ?statuses=Pending,Confirmed,Preparing,Ready (opcional; lista de OrderStatus separados por
    //     coma, case-insensitive, espacios opcionales alrededor de cada valor). Si se manda y no
    //     está vacío/blank, tiene PRIORIDAD sobre 'status' (se ignora 'status' en ese caso).
    //   ?q=search_term (busca en nombre o teléfono del cliente)
    //   ?limit=10 (cantidad de resultados, default: 10)
    //   ?offset=0 (offset de paginación, default: 0)
    [HttpGet]
    public async Task<ActionResult<object>> GetOrders(
        [FromQuery] string status = "pending",
        [FromQuery] string? statuses = null,
        [FromQuery] string? q = null,
        [FromQuery] int limit = 10,
        [FromQuery] int offset = 0,
        CancellationToken ct = default)
    {
        IQueryable<Order> query;

        if (!string.IsNullOrWhiteSpace(statuses))
        {
            var parsed = new List<OrderStatus>();
            foreach (var raw in statuses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (!Enum.TryParse<OrderStatus>(raw, ignoreCase: true, out var s))
                    return BadRequest(new { message = $"Estado inválido en 'statuses': '{raw}'." });
                parsed.Add(s);
            }

            if (parsed.Count == 0)
                return BadRequest(new { message = "El parámetro 'statuses' no puede estar vacío." });

            query = db.Orders.Where(o => o.TenantId == TenantId && parsed.Contains(o.Status));
        }
        else
        {
            if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var orderStatus))
                return BadRequest(new { message = "Estado inválido. Usar 'pending', 'confirmed' o 'cancelled'." });

            query = db.Orders.Where(o => o.TenantId == TenantId && o.Status == orderStatus);
        }

        // Aplicar búsqueda si se proporciona
        if (!string.IsNullOrWhiteSpace(q))
        {
            var searchTerm = q.ToLower();
            query = query.Where(o =>
                o.CustomerName != null && o.CustomerName.ToLower().Contains(searchTerm) ||
                o.CustomerPhone.ToLower().Contains(searchTerm)
            );
        }

        var total = await query.CountAsync(ct);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(ct);

        return Ok(new
        {
            items = orders.Select(MapOrder).ToList(),
            total,
            limit,
            offset
        });
    }

    // GET /api/admin/orders/export
    // Exporta los pedidos del tenant en formato CSV (separador ';', UTF-8 con BOM).
    // Query params:
    //   ?status=pending|confirmed|cancelled (opcional, si no se manda trae todos los estados)
    //   ?from=2025-05-01 (opcional, filtra por CreatedAt >= from)
    //   ?to=2025-05-31 (opcional, filtra por CreatedAt <= to)
    [HttpGet("export")]
    public async Task<IActionResult> ExportOrders(
        [FromQuery] string? status = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
    {
        OrderStatus? orderStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsedStatus))
                return BadRequest(new { message = "Estado inválido. Usar 'pending', 'confirmed' o 'cancelled'." });

            orderStatus = parsedStatus;
        }

        var query = db.Orders.Where(o => o.TenantId == TenantId);

        if (orderStatus is not null)
            query = query.Where(o => o.Status == orderStatus);

        if (from is not null)
            query = query.Where(o => o.CreatedAt >= from);

        if (to is not null)
            query = query.Where(o => o.CreatedAt <= to);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

        var culture = new CultureInfo("es-AR");
        var sb = new StringBuilder();
        sb.AppendLine("Id;Fecha;Cliente;Telefono;Estado;Modalidad;Direccion;MetodoPago;Total");

        foreach (var o in orders)
        {
            sb.AppendLine(string.Join(';', new[]
            {
                CsvHelper.EscapeCsv(o.Id),
                o.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                CsvHelper.EscapeCsv(o.CustomerName),
                CsvHelper.EscapeCsv(o.CustomerPhone),
                CsvHelper.EscapeCsv(o.Status.ToString()),
                CsvHelper.EscapeCsv(o.DeliveryMode),
                CsvHelper.EscapeCsv(o.Address),
                CsvHelper.EscapeCsv(o.PaymentMethod),
                o.TotalPrice.ToString("F2", culture)
            }));
        }

        var bytes = CsvHelper.ToUtf8BomBytes(sb.ToString());
        return File(bytes, "text/csv", $"pedidos_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
    }

    // POST /api/admin/orders/{id}/confirm
    // Confirma un pedido pendiente del tenant.
    [HttpPost("{id}/confirm")]
    public async Task<ActionResult<OrderAdminDto>> ConfirmOrder(string id, CancellationToken ct = default)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == TenantId, ct);

        if (order is null)
            return NotFound(new { message = "Pedido no encontrado." });

        if (order.Status == OrderStatus.Confirmed)
            return BadRequest(new { message = "El pedido ya fue confirmado." });

        order.Status = OrderStatus.Confirmed;
        order.ConfirmedAt = DateTime.UtcNow;

        // Descontar inventario según los insumos asociados a cada producto
        var productIds = order.Items.Select(i => i.ProductId).Distinct().ToList();

        var allProductSupplies = await db.ProductSupplies
            .Where(ps => productIds.Contains(ps.ProductId) && ps.TenantId == TenantId && !ps.IsUnknownQuantity)
            .ToListAsync(ct);

        var supplyIds = allProductSupplies.Select(ps => ps.SupplyId).Distinct().ToList();
        var supplies = await db.Supplies
            .Where(s => supplyIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, ct);

        foreach (var item in order.Items)
        {
            var productSupplies = allProductSupplies.Where(ps => ps.ProductId == item.ProductId);

            foreach (var ps in productSupplies)
            {
                if (!supplies.TryGetValue(ps.SupplyId, out var supply)) continue;

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

        await db.SaveChangesAsync(ct);

        // Emitir evento WebSocket
        await wsManager.BroadcastToTenantAsync(TenantId, new MorfApp.Api.WebSocket.WebSocketEvent
        {
            Type = "order_confirmed",
            Data = new { orderId = order.Id, status = order.Status.ToString().ToLower() }
        });

        return Ok(MapOrder(order));
    }

    // POST /api/admin/orders/{id}/status
    // Avanza el estado de un pedido a Preparing, Ready o Delivered.
    // Transiciones válidas: Confirmed->Preparing, Preparing->Ready, Ready->Delivered.
    // Para Pending->Confirmed usar /confirm; para cancelar usar /cancel.
    [HttpPost("{id}/status")]
    public async Task<ActionResult<OrderAdminDto>> UpdateStatus(string id, [FromBody] UpdateOrderStatusRequest req, CancellationToken ct = default)
    {
        if (!Enum.TryParse<OrderStatus>(req.Status, ignoreCase: true, out var targetStatus))
            return BadRequest(new { message = "Estado inválido." });

        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == TenantId, ct);

        if (order is null)
            return NotFound(new { message = "Pedido no encontrado." });

        var validTransitions = new Dictionary<OrderStatus, OrderStatus>
        {
            [OrderStatus.Confirmed] = OrderStatus.Preparing,
            [OrderStatus.Preparing] = OrderStatus.Ready,
            [OrderStatus.Ready] = OrderStatus.Delivered,
        };

        if (!validTransitions.TryGetValue(order.Status, out var nextExpected) || nextExpected != targetStatus)
        {
            return BadRequest(new
            {
                message = $"No se puede pasar de '{order.Status.ToString().ToLower()}' a '{targetStatus.ToString().ToLower()}'.",
                currentStatus = order.Status.ToString().ToLower()
            });
        }

        order.Status = targetStatus;
        await db.SaveChangesAsync(ct);

        var eventType = targetStatus switch
        {
            OrderStatus.Preparing => "order_preparing",
            OrderStatus.Ready => "order_ready",
            OrderStatus.Delivered => "order_delivered",
            _ => "order_status_changed"
        };

        await wsManager.BroadcastToTenantAsync(TenantId, new MorfApp.Api.WebSocket.WebSocketEvent
        {
            Type = eventType,
            Data = new { orderId = order.Id, status = order.Status.ToString().ToLower() }
        });

        return Ok(MapOrder(order));
    }

    // POST /api/admin/orders/{id}/cancel
    // Cancela un pedido pendiente del tenant.
    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<OrderAdminDto>> CancelOrder(string id, CancellationToken ct = default)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == TenantId, ct);

        if (order is null)
            return NotFound(new { message = "Pedido no encontrado." });

        if (order.Status == OrderStatus.Cancelled)
            return BadRequest(new { message = "El pedido ya fue cancelado." });

        if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed)
            return BadRequest(new { message = $"No se puede cancelar un pedido en estado '{order.Status.ToString().ToLower()}'." });

        order.Status = OrderStatus.Cancelled;
        await db.SaveChangesAsync(ct);

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
            )).ToList(),
            i.Observations
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
