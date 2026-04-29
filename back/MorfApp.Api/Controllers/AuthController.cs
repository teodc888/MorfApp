using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MorfApp.Application.DTOs.Auth;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        try
        {
            var user = await db.AdminUsers
                .Include(u => u.Tenant)
                .FirstOrDefaultAsync(u => u.Email == req.Email);

            bool valid = user is not null && BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash);
            if (!valid)
                return Unauthorized(new { message = "Credenciales inválidas" });

            var response = await IssueTokens(user!);
            return Ok(response);
        }
        catch (Exception)
        {
            return Unauthorized(new { message = "Credenciales inválidas" });
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest req)
    {
        var stored = await db.RefreshTokens
            .Include(r => r.AdminUser)
            .FirstOrDefaultAsync(r => r.Token == req.RefreshToken && !r.IsRevoked);

        if (stored is null || stored.ExpiresAt < DateTime.UtcNow)
            return Unauthorized(new { message = "Token inválido o expirado" });

        stored.IsRevoked = true;
        var response = await IssueTokens(stored.AdminUser);
        return Ok(response);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest req)
    {
        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == req.RefreshToken);

        if (stored is not null)
        {
            stored.IsRevoked = true;
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

    private async Task<AuthResponse> IssueTokens(AdminUser user)
    {
        var expiryMinutes = config.GetValue<int>("Jwt:ExpiryMinutes", 15);
        var refreshDays = config.GetValue<int>("Jwt:RefreshDays", 7);
        var accessToken = GenerateJwt(user, expiryMinutes);
        var refreshToken = GenerateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            AdminUserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshDays)
        });
        await db.SaveChangesAsync();

        return new AuthResponse(accessToken, refreshToken, expiryMinutes * 60);
    }

    private string GenerateJwt(AdminUser user, int expiryMinutes)
    {
        var secret = config["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("is_superadmin", user.IsSuperadmin.ToString().ToLower()),
        };

        if (user.TenantId is not null)
            claims.Add(new("tenant_id", user.TenantId));

        if (user.Tenant?.Slug is not null)
            claims.Add(new("tenant_slug", user.Tenant.Slug));

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }
}
