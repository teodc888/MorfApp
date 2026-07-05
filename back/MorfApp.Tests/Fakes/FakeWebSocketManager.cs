using Microsoft.Extensions.Logging.Abstractions;
using MorfApp.Api.WebSocket;

namespace MorfApp.Tests.Fakes;

/// <summary>
/// WebSocketConnectionManager falso para tests.
/// Captura los eventos emitidos sin conectarse a sockets reales.
/// </summary>
public class FakeWebSocketManager : WebSocketConnectionManager
{
    public FakeWebSocketManager() : base(NullLogger<WebSocketConnectionManager>.Instance)
    {
    }

    public List<(string TenantId, WebSocketEvent Event)> BroadcastedEvents { get; } = [];

    public override Task BroadcastToTenantAsync(string tenantId, WebSocketEvent @event)
    {
        BroadcastedEvents.Add((tenantId, @event));
        return Task.CompletedTask;
    }
}
