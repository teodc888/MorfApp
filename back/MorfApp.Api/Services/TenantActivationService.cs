using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;

namespace MorfApp.Api.Services;

// Deja un Tenant Pending operativo: crea el AdminUser (password placeholder) + SetupToken
// y lo pasa a Active. No envía el email — cada caller decide qué hacer con el setupUrl
// devuelto (el alta manual del SuperAdmin y el webhook de Mercado Pago quieren reaccionar
// distinto si el envío falla).
public class TenantActivationService(IAppDbContext db)
{
    public async Task<(AdminUser AdminUser, string SetupUrl)> ActivateAsync(Tenant tenant, string frontendUrl, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var adminUser = new AdminUser
        {
            TenantId = tenant.Id,
            Email = tenant.OwnerEmail!,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            IsSuperadmin = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.AdminUsers.Add(adminUser);

        var setupToken = new SetupToken
        {
            AdminUserId = adminUser.Id,
            Token = Guid.NewGuid().ToString("N"),
            ExpiresAt = now.AddHours(48),
            IsUsed = false,
            CreatedAt = now,
        };
        db.SetupTokens.Add(setupToken);

        tenant.Status = TenantStatus.Active;
        tenant.SubscriptionEndsAt = now.AddDays(30);
        tenant.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        var setupUrl = $"{frontendUrl}/setup?token={setupToken.Token}";
        return (adminUser, setupUrl);
    }
}
