using MorfApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MorfApp.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<Tenant> Tenants { get; }
    DbSet<TenantBranding> TenantBrandings { get; }
    DbSet<DeliveryConfig> DeliveryConfigs { get; }
    DbSet<BusinessHour> BusinessHours { get; }
    DbSet<Category> Categories { get; }
    DbSet<Product> Products { get; }
    DbSet<ModifierGroup> ModifierGroups { get; }
    DbSet<ModifierOption> ModifierOptions { get; }
    DbSet<AdminUser> AdminUsers { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<PageView> PageViews { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
