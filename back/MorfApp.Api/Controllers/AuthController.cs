using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MorfApp.Application.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController(IAppDbContext db, IConfiguration config, ILogger<AuthController> logger, IEmailService emailService) : ControllerBase
{
    internal static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

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
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Error inesperado en login para {Email}", req.Email);
            return Unauthorized(new { message = "Credenciales inválidas" });
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest req)
    {
        var hashedToken = HashToken(req.RefreshToken);
        var stored = await db.RefreshTokens
            .Include(r => r.AdminUser)
            .ThenInclude(u => u.Tenant)
            .FirstOrDefaultAsync(r => r.Token == hashedToken);

        if (stored is null)
            return Unauthorized(new { message = "Token inválido o expirado" });

        if (stored.IsRevoked)
        {
            // Reuso de un refresh token ya revocado: posible robo de sesión.
            // Revocamos todas las sesiones activas del usuario por seguridad.
            await RevokeActiveRefreshTokensAsync(stored.AdminUserId);
            await db.SaveChangesAsync();

            return Unauthorized(new { message = "Token inválido o expirado" });
        }

        if (stored.ExpiresAt < DateTime.UtcNow)
            return Unauthorized(new { message = "Token inválido o expirado" });

        stored.IsRevoked = true;
        var response = await IssueTokens(stored.AdminUser);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("setup-password")]
    public async Task<IActionResult> SetupPassword([FromBody] SetupPasswordRequest req)
    {
        var setupToken = await db.SetupTokens
            .Include(s => s.AdminUser)
            .FirstOrDefaultAsync(s => s.Token == req.Token && !s.IsUsed);

        if (setupToken is null || setupToken.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "El link es inválido o ya expiró" });

        setupToken.AdminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        setupToken.AdminUser.UpdatedAt = DateTime.UtcNow;
        setupToken.IsUsed = true;
        await db.SaveChangesAsync();

        return Ok(new { message = "Contraseña configurada correctamente" });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest req)
    {
        var hashedToken = HashToken(req.RefreshToken);
        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == hashedToken);

        if (stored is not null)
        {
            stored.IsRevoked = true;
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

    // POST /api/auth/change-password
    // Requiere JWT válido del admin logueado (no es público). Verifica la contraseña actual con
    // BCrypt, hashea la nueva, y revoca TODOS los refresh tokens activos del usuario para forzar
    // re-login en otras pestañas/dispositivos.
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "La contraseña actual es incorrecta." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await RevokeActiveRefreshTokensAsync(user.Id);

        await db.SaveChangesAsync();

        return Ok(new { message = "Contraseña actualizada correctamente." });
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == req.Email && !u.IsSuperadmin);

        if (user is not null)
        {
            // Invalidar tokens de recuperación/setup previos sin usar de este usuario
            var oldTokens = db.SetupTokens.Where(s => s.AdminUserId == user.Id && !s.IsUsed);
            await oldTokens.ForEachAsync(s => s.IsUsed = true);

            var token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
            db.SetupTokens.Add(new SetupToken
            {
                AdminUserId = user.Id,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                IsUsed = false,
            });
            await db.SaveChangesAsync();

            var frontendUrl = config["App:FrontendUrl"] ?? "https://morfapp.app";
            var resetUrl = $"{frontendUrl}/admin/reset-password?token={token}";

            try
            {
                await emailService.SendPasswordResetEmailAsync(user.Email, user.Email, resetUrl);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "No se pudo enviar el email de recuperación de contraseña a {Email}", req.Email);
            }
        }

        // Responder siempre 200 para no filtrar qué emails existen
        return Ok(new { message = "Si el email existe, vas a recibir un correo con instrucciones." });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        var setupToken = await db.SetupTokens
            .Include(s => s.AdminUser)
            .FirstOrDefaultAsync(s => s.Token == req.Token && !s.IsUsed);

        if (setupToken is null || setupToken.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "El link es inválido o ya expiró" });

        setupToken.AdminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        setupToken.AdminUser.UpdatedAt = DateTime.UtcNow;
        setupToken.IsUsed = true;

        await RevokeActiveRefreshTokensAsync(setupToken.AdminUserId);

        await db.SaveChangesAsync();

        return Ok(new { message = "Contraseña actualizada correctamente." });
    }

    // Revoca (sin persistir) todos los refresh tokens activos de un usuario — el caller es
    // responsable de llamar SaveChangesAsync junto con el resto de sus cambios.
    private async Task RevokeActiveRefreshTokensAsync(string userId)
    {
        var activeTokens = await db.RefreshTokens
            .Where(r => r.AdminUserId == userId && !r.IsRevoked)
            .ToListAsync();
        foreach (var t in activeTokens)
            t.IsRevoked = true;
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
            Token = HashToken(refreshToken),
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
            new("role", user.Role),
        };

        // Los owners siempre tienen acceso total; los empleados solo a los módulos
        // que el owner les otorgó (AdminUser.Permissions). Ver PermissionKeys.
        IEnumerable<string> grantedPermissions = user.Role == "owner" ? MorfApp.Domain.Constants.PermissionKeys.All : user.Permissions;
        foreach (var perm in grantedPermissions)
            claims.Add(new("perm", perm));

        if (user.TenantId is not null)
            claims.Add(new("tenant_id", user.TenantId));

        if (user.Tenant?.Slug is not null)
            claims.Add(new("tenant_slug", user.Tenant.Slug));

        if (user.Tenant?.Plan is not null)
            claims.Add(new("tenant_plan", user.Tenant.Plan.ToString()));

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
