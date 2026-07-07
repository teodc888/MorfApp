using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace MorfApp.Api.WebSocket;

public class WebSocketConnectionManager(ILogger<WebSocketConnectionManager> logger)
{
    private readonly ConcurrentDictionary<string, WebSocketClientConnection> _connections = new();

    public void AddConnection(string tenantId, string connectionId, System.Net.WebSockets.WebSocket socket)
    {
        var connection = new WebSocketClientConnection { TenantId = tenantId, Socket = socket };
        _connections.TryAdd(connectionId, connection);
    }

    public void RemoveConnection(string connectionId)
    {
        _connections.TryRemove(connectionId, out _);
    }

    public virtual async Task BroadcastToTenantAsync(string tenantId, WebSocketEvent @event)
    {
        var tenantConnections = _connections.Values
            .Where(c => c.TenantId == tenantId && c.Socket.State == WebSocketState.Open)
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
    }
}

public class WebSocketEvent
{
    public string Type { get; set; } = string.Empty;
    public object? Data { get; set; }
}
