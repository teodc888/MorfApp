using Microsoft.EntityFrameworkCore;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Enums;

namespace MorfApp.Api.Services;

/// <summary>
/// Job diario que marca Inactive a los tenants cuya suscripción venció hace más de
/// GracePeriodDays. La lógica de negocio vive en el método estático MarkExpiredTenantsInactiveAsync
/// (testeable directamente con EF InMemory, sin necesidad de levantar el hosted service completo —
/// mismo patrón que StoreController.IsCurrentlyOpen o WebSocketHandler.ValidateAndExtractTenantId).
/// </summary>
public class SubscriptionExpirationService(
    IServiceScopeFactory scopeFactory,
    ILogger<SubscriptionExpirationService> logger) : BackgroundService
{
    internal const int GracePeriodDays = 7;
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
                var count = await MarkExpiredTenantsInactiveAsync(db, DateTime.UtcNow, stoppingToken);
                if (count > 0)
                    logger.LogInformation("SubscriptionExpirationService: {Count} tenant(s) marcados Inactive por suscripción vencida", count);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error corriendo el chequeo de suscripciones vencidas");
            }
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    /// <summary>
    /// Marca Status = Inactive a los tenants Active cuya SubscriptionEndsAt esté vencida
    /// hace más de GracePeriodDays respecto de utcNow. Devuelve la cantidad de tenants afectados.
    /// Público/testeable de forma aislada: recibe el IAppDbContext y el "ahora" como parámetros.
    /// </summary>
    internal static async Task<int> MarkExpiredTenantsInactiveAsync(IAppDbContext db, DateTime utcNow, CancellationToken ct = default)
    {
        var cutoff = utcNow.AddDays(-GracePeriodDays);

        var expired = await db.Tenants
            .Where(t => t.Status == TenantStatus.Active
                     && t.SubscriptionEndsAt != null
                     && t.SubscriptionEndsAt < cutoff)
            .ToListAsync(ct);

        foreach (var tenant in expired)
        {
            tenant.Status = TenantStatus.Inactive;
            tenant.UpdatedAt = utcNow;
        }

        if (expired.Count > 0)
            await db.SaveChangesAsync(ct);

        return expired.Count;
    }
}
