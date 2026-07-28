using System.IdentityModel.Tokens.Jwt;
using System.Net.WebSockets;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MorfApp.Application.Interfaces;

namespace MorfApp.Api.WebSocket;

public class WebSocketHandler
{
    private readonly WebSocketConnectionManager _manager;
    private readonly IConfiguration _config;
    private readonly IAppDbContext _db;

    public WebSocketHandler(WebSocketConnectionManager manager, IConfiguration config, IAppDbContext db)
    {
        _manager = manager;
        _config = config;
        _db = db;
    }

    public async Task HandleAsync(HttpContext context, string connectionId)
    {
        var token = context.Request.Query["token"].ToString();
        string tenantId;
        var connectionType = WebSocketConnectionType.Admin;

        if (!string.IsNullOrEmpty(token))
        {
            // Panel admin: validar token (firma, expiración) y extraer tenant_id
            var jwtSecret = _config["Jwt:Secret"]!;
            var resolvedTenantId = ValidateAndExtractTenantId(token, jwtSecret);
            if (string.IsNullOrEmpty(resolvedTenantId))
            {
                context.Response.StatusCode = 401;
                return;
            }
            tenantId = resolvedTenantId;
        }
        else
        {
            // Storefront público: sin JWT, se identifica por tenant slug.
            var slug = context.Request.Query["tenantSlug"].ToString();
            if (string.IsNullOrEmpty(slug))
            {
                context.Response.StatusCode = 401;
                return;
            }

            var resolvedTenantId = await _db.Tenants
                .Where(t => t.Slug == slug)
                .Select(t => t.Id)
                .FirstOrDefaultAsync();
            if (string.IsNullOrEmpty(resolvedTenantId))
            {
                context.Response.StatusCode = 404;
                return;
            }
            tenantId = resolvedTenantId;
            connectionType = WebSocketConnectionType.Public;
        }

        var ws = await context.WebSockets.AcceptWebSocketAsync();
        _manager.AddConnection(tenantId, connectionId, ws, connectionType);

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

    // Validación completa del JWT (firma, issuer/audience, expiración) con los mismos
    // TokenValidationParameters que usa la autenticación normal en Program.cs.
    // Testeable sin dependencias de instancia. Cualquier excepción (firma inválida,
    // token expirado, malformado, etc.) se trata como token inválido -> devuelve null.
    internal static string? ValidateAndExtractTenantId(string token, string jwtSecret)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var parameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var principal = handler.ValidateToken(token, parameters, out _);
            return principal.Claims.FirstOrDefault(c => c.Type == "tenant_id")?.Value;
        }
        catch
        {
            return null;
        }
    }
}
