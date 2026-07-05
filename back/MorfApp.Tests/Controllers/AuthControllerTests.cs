using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.Auth;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class AuthControllerTests : TestBase
{
    private AuthController CreateController(ILogger<AuthController>? logger = null, Mock<IEmailService>? emailServiceMock = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"]        = "supersecretkey_atleast32chars_long!!",
                ["Jwt:ExpiryMinutes"] = "15",
                ["Jwt:RefreshDays"]   = "7",
                ["App:FrontendUrl"]   = "https://pre.morfapp.app",
            })
            .Build();

        var ctrl = new AuthController(Db, config, logger ?? NullLogger<AuthController>.Instance, (emailServiceMock ?? new Mock<IEmailService>()).Object);
        return ctrl;
    }

    // ── Login ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_ValidCredentials_ReturnsTokens()
    {
        var tenant = await CreateTenantAsync();
        await CreateAdminUserAsync(tenant.Id, "admin@test.com", "correctpass");

        var ctrl   = CreateController();
        var result = await ctrl.Login(new LoginRequest("admin@test.com", "correctpass"));

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<AuthResponse>(ok.Value);
        Assert.False(string.IsNullOrWhiteSpace(dto.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(dto.RefreshToken));
        Assert.True(dto.ExpiresIn > 0);
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        var tenant = await CreateTenantAsync();
        await CreateAdminUserAsync(tenant.Id, "admin@test.com", "correctpass");

        var ctrl   = CreateController();
        var result = await ctrl.Login(new LoginRequest("admin@test.com", "wrongpass"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_NonExistentEmail_ReturnsUnauthorized()
    {
        var ctrl   = CreateController();
        var result = await ctrl.Login(new LoginRequest("noone@test.com", "anypass"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_EmptyEmail_ReturnsUnauthorized()
    {
        var ctrl   = CreateController();
        var result = await ctrl.Login(new LoginRequest("", "anypass"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_Superadmin_ReturnsTokensWithoutTenantId()
    {
        // Superadmin no tiene TenantId
        var user = new AdminUser
        {
            TenantId     = null,
            Email        = "super@morfapp.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("superpass"),
            IsSuperadmin = true,
        };
        Db.AdminUsers.Add(user);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.Login(new LoginRequest("super@morfapp.com", "superpass"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<AuthResponse>(ok.Value);
    }

    [Fact]
    public async Task Login_InvalidStoredHash_LogsWarningAndReturnsUnauthorized()
    {
        var tenant = await CreateTenantAsync();
        var user = new AdminUser
        {
            TenantId     = tenant.Id,
            Email        = "corrupto@test.com",
            PasswordHash = "esto-no-es-un-hash-bcrypt-valido",
            IsSuperadmin = false,
        };
        Db.AdminUsers.Add(user);
        await Db.SaveChangesAsync();

        var mockLogger = new Mock<ILogger<AuthController>>();
        var ctrl = CreateController(mockLogger.Object);

        var result = await ctrl.Login(new LoginRequest("corrupto@test.com", "cualquierpass"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);

        mockLogger.Verify(
            l => l.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    // ── Refresh ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Refresh_ValidToken_ReturnsNewTokens()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id);
        var ctrl   = CreateController();

        // Obtener tokens iniciales
        var loginResult = await ctrl.Login(new LoginRequest("admin@test.com", "password123"));
        var loginOk     = Assert.IsType<OkObjectResult>(loginResult.Result);
        var loginDto    = Assert.IsType<AuthResponse>(loginOk.Value);

        // Refresh
        var result = await ctrl.Refresh(new RefreshRequest(loginDto.RefreshToken));

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<AuthResponse>(ok.Value);
        Assert.False(string.IsNullOrWhiteSpace(dto.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(dto.RefreshToken));
        // El nuevo refresh token debe ser distinto
        Assert.NotEqual(loginDto.RefreshToken, dto.RefreshToken);
    }

    [Fact]
    public async Task Refresh_InvalidToken_ReturnsUnauthorized()
    {
        var ctrl   = CreateController();
        var result = await ctrl.Refresh(new RefreshRequest("totally-fake-token"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Refresh_RevokedToken_ReturnsUnauthorized()
    {
        var tenant = await CreateTenantAsync();
        await CreateAdminUserAsync(tenant.Id);
        var ctrl = CreateController();

        var loginResult = await ctrl.Login(new LoginRequest("admin@test.com", "password123"));
        var loginOk     = Assert.IsType<OkObjectResult>(loginResult.Result);
        var loginDto    = Assert.IsType<AuthResponse>(loginOk.Value);

        // Primera llamada a refresh revoca el token
        await ctrl.Refresh(new RefreshRequest(loginDto.RefreshToken));

        // Segunda llamada con el mismo token debe fallar
        var result = await ctrl.Refresh(new RefreshRequest(loginDto.RefreshToken));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Refresh_ExpiredToken_ReturnsUnauthorized()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id);

        // Insertar token expirado manualmente
        var expiredToken = new RefreshToken
        {
            AdminUserId = user.Id,
            Token       = "expired-token-xyz",
            ExpiresAt   = DateTime.UtcNow.AddDays(-1),
            IsRevoked   = false,
        };
        Db.RefreshTokens.Add(expiredToken);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.Refresh(new RefreshRequest("expired-token-xyz"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    // ── Logout ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Logout_ExistingToken_RevokesToken()
    {
        var tenant = await CreateTenantAsync();
        await CreateAdminUserAsync(tenant.Id);
        var ctrl = CreateController();

        var loginResult = await ctrl.Login(new LoginRequest("admin@test.com", "password123"));
        var loginOk     = Assert.IsType<OkObjectResult>(loginResult.Result);
        var loginDto    = Assert.IsType<AuthResponse>(loginOk.Value);

        var logoutResult = await ctrl.Logout(new RefreshRequest(loginDto.RefreshToken));
        Assert.IsType<NoContentResult>(logoutResult);

        // Refresh debe fallar después del logout
        var refreshResult = await ctrl.Refresh(new RefreshRequest(loginDto.RefreshToken));
        Assert.IsType<UnauthorizedObjectResult>(refreshResult.Result);
    }

    [Fact]
    public async Task Logout_NonExistentToken_ReturnsNoContent()
    {
        // Logout de token que no existe no debe lanzar error
        var ctrl   = CreateController();
        var result = await ctrl.Logout(new RefreshRequest("fake-token-that-doesnt-exist"));

        Assert.IsType<NoContentResult>(result);
    }

    // ── SetupPassword ───────────────────────────────────────────────────────────

    [Fact]
    public async Task SetupPassword_ValidToken_SetsPasswordAndRevokesToken()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id);

        var setupToken = new SetupToken
        {
            AdminUserId = user.Id,
            Token       = "valid-setup-token",
            ExpiresAt   = DateTime.UtcNow.AddHours(24),
            IsUsed      = false,
        };
        Db.SetupTokens.Add(setupToken);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.SetupPassword(new SetupPasswordRequest("valid-setup-token", "NewPassword123!"));

        Assert.IsType<OkObjectResult>(result);

        // El token debe estar marcado como usado
        var updatedToken = await Db.SetupTokens.FindAsync(setupToken.Id);
        Assert.True(updatedToken!.IsUsed);

        // La contraseña debe haberse actualizado — verificar con BCrypt
        var updatedUser = await Db.AdminUsers.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("NewPassword123!", updatedUser!.PasswordHash));
    }

    [Fact]
    public async Task SetupPassword_InvalidToken_ReturnsBadRequest()
    {
        var ctrl   = CreateController();
        var result = await ctrl.SetupPassword(new SetupPasswordRequest("nonexistent-token", "NewPassword123!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SetupPassword_ExpiredToken_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id);

        var setupToken = new SetupToken
        {
            AdminUserId = user.Id,
            Token       = "expired-setup-token",
            ExpiresAt   = DateTime.UtcNow.AddHours(-1), // ya expiró
            IsUsed      = false,
        };
        Db.SetupTokens.Add(setupToken);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.SetupPassword(new SetupPasswordRequest("expired-setup-token", "NewPassword123!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SetupPassword_AlreadyUsedToken_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id);

        var setupToken = new SetupToken
        {
            AdminUserId = user.Id,
            Token       = "used-setup-token",
            ExpiresAt   = DateTime.UtcNow.AddHours(24),
            IsUsed      = true, // ya fue usado
        };
        Db.SetupTokens.Add(setupToken);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.SetupPassword(new SetupPasswordRequest("used-setup-token", "NewPassword123!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // ── ChangePassword (A3) ─────────────────────────────────────────────────────────

    // Simula un usuario autenticado con el Id real de un AdminUser de prueba. El controller
    // lee el user id desde ClaimTypes.NameIdentifier con fallback a "sub" (JwtRegisteredClaimNames.Sub),
    // por eso se agregan ambos claims. NO se usa TestBase.SetupTenantClaims porque ese helper
    // genera un "sub" aleatorio que no corresponde a ningún AdminUser real.
    private static void SetAuthenticatedUser(AuthController ctrl, string userId)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(JwtRegisteredClaimNames.Sub, userId),
        };
        var identity  = new ClaimsIdentity(claims);
        var principal = new ClaimsPrincipal(identity);
        ctrl.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id, "admin@test.com", "correctpass");

        var ctrl = CreateController();
        SetAuthenticatedUser(ctrl, user.Id);

        var result = await ctrl.ChangePassword(new ChangePasswordRequest("wrongpass", "NewPassword123!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrentPassword_UpdatesHashAndRevokesActiveRefreshTokens()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id, "admin@test.com", "correctpass");

        // Dos sesiones activas simuladas
        var token1 = new RefreshToken { AdminUserId = user.Id, Token = "session-1", ExpiresAt = DateTime.UtcNow.AddDays(7), IsRevoked = false };
        var token2 = new RefreshToken { AdminUserId = user.Id, Token = "session-2", ExpiresAt = DateTime.UtcNow.AddDays(7), IsRevoked = false };
        Db.RefreshTokens.Add(token1);
        Db.RefreshTokens.Add(token2);
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        SetAuthenticatedUser(ctrl, user.Id);

        var result = await ctrl.ChangePassword(new ChangePasswordRequest("correctpass", "NewPassword123!"));

        Assert.IsType<OkObjectResult>(result);

        var updatedUser = await Db.AdminUsers.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("NewPassword123!", updatedUser!.PasswordHash));

        var updatedToken1 = await Db.RefreshTokens.FindAsync(token1.Id);
        var updatedToken2 = await Db.RefreshTokens.FindAsync(token2.Id);
        Assert.True(updatedToken1!.IsRevoked);
        Assert.True(updatedToken2!.IsRevoked);
    }

    // Test intencionalmente basado en reflection: este proyecto de tests es 100% unitario
    // (invoca métodos de controller directamente vía TestBase, sin WebApplicationFactory/TestServer),
    // así que invocar ChangePassword directamente "tendría éxito" sin importar los claims —
    // el filtro [Authorize] lo aplica el pipeline de ASP.NET, nunca el propio método C#.
    [Fact]
    public void ChangePassword_HasAuthorizeAttribute()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.ChangePassword));
        var hasAuthorize = method!.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), inherit: true).Any()
            || typeof(AuthController).GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), inherit: true).Any();
        Assert.True(hasAuthorize, "ChangePassword debe requerir autenticación ([Authorize]).");
    }

    // ── ForgotPassword / ResetPassword (A4) ──────────────────────────────────────

    [Fact]
    public async Task ForgotPassword_ExistingEmail_ReturnsOkAndCreatesSetupToken()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id, "recuperar@test.com", "correctpass");

        var ctrl   = CreateController();
        var result = await ctrl.ForgotPassword(new ForgotPasswordRequest("recuperar@test.com"));

        Assert.IsType<OkObjectResult>(result);

        var setupToken = await Db.SetupTokens
            .Where(s => s.AdminUserId == user.Id && !s.IsUsed)
            .FirstOrDefaultAsync();

        Assert.NotNull(setupToken);
        Assert.True(setupToken!.ExpiresAt > DateTime.UtcNow.AddMinutes(50));
        Assert.True(setupToken.ExpiresAt < DateTime.UtcNow.AddMinutes(70));
    }

    [Fact]
    public async Task ForgotPassword_NonExistentEmail_ReturnsOkAnyway()
    {
        var ctrl   = CreateController();
        var result = await ctrl.ForgotPassword(new ForgotPasswordRequest("noexiste@test.com"));

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task ResetPassword_ValidToken_UpdatesPasswordAndRevokesRefreshTokens()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id, "reset@test.com", "oldpass");

        var token1 = new RefreshToken { AdminUserId = user.Id, Token = "reset-session-1", ExpiresAt = DateTime.UtcNow.AddDays(7), IsRevoked = false };
        var token2 = new RefreshToken { AdminUserId = user.Id, Token = "reset-session-2", ExpiresAt = DateTime.UtcNow.AddDays(7), IsRevoked = false };
        Db.RefreshTokens.Add(token1);
        Db.RefreshTokens.Add(token2);

        var setupToken = new SetupToken
        {
            AdminUserId = user.Id,
            Token       = "valid-reset-token",
            ExpiresAt   = DateTime.UtcNow.AddHours(1),
            IsUsed      = false,
        };
        Db.SetupTokens.Add(setupToken);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ResetPassword(new ResetPasswordRequest("valid-reset-token", "NewPassword123!"));

        Assert.IsType<OkObjectResult>(result);

        var updatedUser = await Db.AdminUsers.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("NewPassword123!", updatedUser!.PasswordHash));

        var updatedSetupToken = await Db.SetupTokens.FindAsync(setupToken.Id);
        Assert.True(updatedSetupToken!.IsUsed);

        var updatedToken1 = await Db.RefreshTokens.FindAsync(token1.Id);
        var updatedToken2 = await Db.RefreshTokens.FindAsync(token2.Id);
        Assert.True(updatedToken1!.IsRevoked);
        Assert.True(updatedToken2!.IsRevoked);
    }

    [Fact]
    public async Task ResetPassword_ExpiredToken_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id);

        Db.SetupTokens.Add(new SetupToken
        {
            AdminUserId = user.Id,
            Token       = "expired-reset-token",
            ExpiresAt   = DateTime.UtcNow.AddHours(-1),
            IsUsed      = false,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ResetPassword(new ResetPasswordRequest("expired-reset-token", "NewPassword123!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ResetPassword_AlreadyUsedToken_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id);

        Db.SetupTokens.Add(new SetupToken
        {
            AdminUserId = user.Id,
            Token       = "used-reset-token",
            ExpiresAt   = DateTime.UtcNow.AddHours(1),
            IsUsed      = true,
        });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController();
        var result = await ctrl.ResetPassword(new ResetPasswordRequest("used-reset-token", "NewPassword123!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ResetPassword_NonExistentToken_ReturnsBadRequest()
    {
        var ctrl   = CreateController();
        var result = await ctrl.ResetPassword(new ResetPasswordRequest("nonexistent-token", "NewPassword123!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // ── Refresh token hashing (S5) ────────────────────────────────────────────────

    [Fact]
    public async Task IssueTokens_StoresHashedTokenNotPlaintext()
    {
        var tenant = await CreateTenantAsync();
        await CreateAdminUserAsync(tenant.Id, "admin@test.com", "password123");

        var ctrl   = CreateController();
        var result = await ctrl.Login(new LoginRequest("admin@test.com", "password123"));

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<AuthResponse>(ok.Value);

        var row = await Db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == AuthController.HashToken(dto.RefreshToken));

        Assert.NotNull(row);
        Assert.NotEqual(dto.RefreshToken, row!.Token);
        Assert.Equal(AuthController.HashToken(dto.RefreshToken), row.Token);
    }

    [Fact]
    public async Task Refresh_NewToken_IsAlsoStoredHashed()
    {
        var tenant = await CreateTenantAsync();
        await CreateAdminUserAsync(tenant.Id);
        var ctrl = CreateController();

        var loginResult = await ctrl.Login(new LoginRequest("admin@test.com", "password123"));
        var loginOk     = Assert.IsType<OkObjectResult>(loginResult.Result);
        var loginDto    = Assert.IsType<AuthResponse>(loginOk.Value);

        var refreshResult = await ctrl.Refresh(new RefreshRequest(loginDto.RefreshToken));
        var refreshOk      = Assert.IsType<OkObjectResult>(refreshResult.Result);
        var refreshDto     = Assert.IsType<AuthResponse>(refreshOk.Value);

        var row = await Db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == AuthController.HashToken(refreshDto.RefreshToken));

        Assert.NotNull(row);
        Assert.NotEqual(refreshDto.RefreshToken, row!.Token);
        Assert.Equal(AuthController.HashToken(refreshDto.RefreshToken), row.Token);
    }

    [Fact]
    public async Task Refresh_ReusedRevokedToken_RevokesAllActiveSessionsOfUser()
    {
        var tenant = await CreateTenantAsync();
        var user   = await CreateAdminUserAsync(tenant.Id);
        var ctrl   = CreateController();

        var loginResult = await ctrl.Login(new LoginRequest("admin@test.com", "password123"));
        var loginOk     = Assert.IsType<OkObjectResult>(loginResult.Result);
        var loginDto    = Assert.IsType<AuthResponse>(loginOk.Value);
        var r1 = loginDto.RefreshToken;

        // Primer refresh: revoca R1 y emite R2
        await ctrl.Refresh(new RefreshRequest(r1));

        // Simular otra sesión activa
        Db.RefreshTokens.Add(new RefreshToken
        {
            AdminUserId = user.Id,
            Token       = AuthController.HashToken("otra-sesion-activa"),
            ExpiresAt   = DateTime.UtcNow.AddDays(7),
            IsRevoked   = false,
        });
        await Db.SaveChangesAsync();

        // Reuso de R1 ya revocado
        var result = await ctrl.Refresh(new RefreshRequest(r1));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);

        var otraSesion = await Db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == AuthController.HashToken("otra-sesion-activa"));
        Assert.NotNull(otraSesion);
        Assert.True(otraSesion!.IsRevoked);
    }
}
