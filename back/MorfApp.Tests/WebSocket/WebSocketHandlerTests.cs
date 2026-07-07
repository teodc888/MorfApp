using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MorfApp.Api.WebSocket;
using Xunit;

namespace MorfApp.Tests.WebSocket;

/// <summary>
/// Tests de <see cref="WebSocketHandler.ValidateAndExtractTenantId"/> — método internal
/// accesible por [assembly: InternalsVisibleTo("MorfApp.Tests")] en MorfApp.Api.
/// Genera JWTs de prueba con JwtSecurityTokenHandler, sin depender de AuthController.
/// </summary>
public class WebSocketHandlerTests
{
    private const string ValidSecret = "test-secret-key-atleast32characters-long!!";

    private static string GenerateToken(string secret, string? tenantId = "tenant-123", DateTime? expires = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, "user-1"),
        };
        if (tenantId is not null)
            claims.Add(new Claim("tenant_id", tenantId));

        var token = new JwtSecurityToken(
            claims: claims,
            expires: expires ?? DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public void ValidateAndExtractTenantId_ValidSignedToken_ReturnsTenantId()
    {
        var token = GenerateToken(ValidSecret, tenantId: "tenant-abc");

        var result = WebSocketHandler.ValidateAndExtractTenantId(token, ValidSecret);

        Assert.Equal("tenant-abc", result);
    }

    [Fact]
    public void ValidateAndExtractTenantId_UnsignedToken_ReturnsNull()
    {
        // Token sin SigningCredentials -> JWT con alg "none". RequireSignedTokens (default true)
        // hace que ValidateToken lo rechace.
        var claims = new List<Claim> { new("tenant_id", "tenant-abc") };
        var unsignedJwt = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.AddMinutes(15));
        var unsignedToken = new JwtSecurityTokenHandler().WriteToken(unsignedJwt);

        var result = WebSocketHandler.ValidateAndExtractTenantId(unsignedToken, ValidSecret);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateAndExtractTenantId_WrongSigningKey_ReturnsNull()
    {
        var token = GenerateToken(ValidSecret, tenantId: "tenant-abc");
        const string wrongSecret = "a-totally-different-secret-key-32chars!!";

        var result = WebSocketHandler.ValidateAndExtractTenantId(token, wrongSecret);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateAndExtractTenantId_ExpiredToken_ReturnsNull()
    {
        var token = GenerateToken(ValidSecret, tenantId: "tenant-abc", expires: DateTime.UtcNow.AddMinutes(-5));

        var result = WebSocketHandler.ValidateAndExtractTenantId(token, ValidSecret);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateAndExtractTenantId_MissingTenantIdClaim_ReturnsNull()
    {
        var token = GenerateToken(ValidSecret, tenantId: null);

        var result = WebSocketHandler.ValidateAndExtractTenantId(token, ValidSecret);

        Assert.Null(result);
    }
}
