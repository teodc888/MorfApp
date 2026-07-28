using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace MorfApp.Api.WebSocket;

public enum WebSocketConnectionType
{
    // Panel admin, autenticado por JWT. Recibe todos los eventos de pedidos.
    Admin,
    // Storefront público, identificado solo por tenant slug (sin JWT). NUNCA debe
    // recibir eventos con datos de pedidos (nombre/total de otros clientes) — solo
    // eventos explícitamente pensados para difusión pública (ej. store_status).
    Public,
}

public class WebSocketConnectionManager(ILogger<WebSocketConnectionManager> logger)
{
    private readonly ConcurrentDictionary<string, WebSocketClientConnection> _connections = new();

    public void AddConnection(string tenantId, string connectionId, System.Net.WebSockets.WebSocket socket, WebSocketConnectionType type = WebSocketConnectionType.Admin)
    {
        var connection = new WebSocketClientConnection { TenantId = tenantId, Socket = socket, Type = type };
        _connections.TryAdd(connectionId, connection);
    }

    public void RemoveConnection(string connectionId)
    {
        _connections.TryRemove(connectionId, out _);
    }

    // Eventos de pedidos (new_order, order_confirmed, etc) — solo panel admin.
    public virtual Task BroadcastToTenantAsync(string tenantId, WebSocketEvent @event) =>
        SendToAsync(tenantId, WebSocketConnectionType.Admin, @event);

    // Eventos aptos para difusión pública (ej. store_status) — solo storefront.
    public virtual Task BroadcastToPublicAsync(string tenantId, WebSocketEvent @event) =>
        SendToAsync(tenantId, WebSocketConnectionType.Public, @event);

    private async Task SendToAsync(string tenantId, WebSocketConnectionType type, WebSocketEvent @event)
    {
        var tenantConnections = _connections.Values
            .Where(c => c.TenantId == tenantId && c.Type == type && c.Socket.State == WebSocketState.Open)
            .ToList();

        var json = JsonSerializer.Serialize(@event);
        var bytes = Encoding.UTF8.GetBytes(json);

        foreach (var conn in tenantConnections)
        {
            try
            {
                await conn.Socket.SendAsync(
                    new ArraySegment<byte>(bytes),
                    WebSocketMessageType.Text,
                    true,
                    CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error al enviar evento WS al tenant {TenantId}", tenantId);
            }
        }
    }

    public class WebSocketClientConnection
    {
        public string TenantId { get; set; } = string.Empty;
        public System.Net.WebSockets.WebSocket Socket { get; set; } = null!;
        public WebSocketConnectionType Type { get; set; } = WebSocketConnectionType.Admin;
    }
}

public class WebSocketEvent
{
    public string Type { get; set; } = string.Empty;
    public object? Data { get; set; }
}
