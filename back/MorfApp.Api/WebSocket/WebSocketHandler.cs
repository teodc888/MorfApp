using System.IdentityModel.Tokens.Jwt;
using System.Net.WebSockets;
using System.Text;

namespace MorfApp.Api.WebSocket;

public class WebSocketHandler
{
    private readonly WebSocketConnectionManager _manager;
    private readonly IConfiguration _config;

    public WebSocketHandler(WebSocketConnectionManager manager, IConfiguration config)
    {
        _manager = manager;
        _config = config;
    }

    public async Task HandleAsync(HttpContext context, string connectionId)
    {
        // Obtener token del query string
        var token = context.Request.Query["token"].ToString();
        if (string.IsNullOrEmpty(token))
        {
            context.Response.StatusCode = 401;
            return;
        }

        // Validar token y extraer tenant_id
        var tenantId = ExtractTenantIdFromToken(token);
        if (string.IsNullOrEmpty(tenantId))
        {
            context.Response.StatusCode = 401;
            return;
        }

        var ws = await context.WebSockets.AcceptWebSocketAsync();
        _manager.AddConnection(tenantId, connectionId, ws);

        try
        {
            var buffer = new byte[1024 * 4];
            WebSocketReceiveResult result = await ws.ReceiveAsync(
                new ArraySegment<byte>(buffer), CancellationToken.None);

            while (!result.CloseStatus.HasValue)
            {
                result = await ws.ReceiveAsync(
                    new ArraySegment<byte>(buffer), CancellationToken.None);
            }

            await ws.CloseAsync(
                result.CloseStatus.Value,
                result.CloseStatusDescription,
                CancellationToken.None);
        }
        finally
        {
            _manager.RemoveConnection(connectionId);
            ws.Dispose();
        }
    }

    private string? ExtractTenantIdFromToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(token);
            return jwtToken.Claims.FirstOrDefault(c => c.Type == "tenant_id")?.Value;
        }
        catch
        {
            return null;
        }
    }
}
