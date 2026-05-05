using MorfApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MorfApp.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<Tenant> Tenants { get; }
    DbSet<TenantBranding> TenantBrandings { get; }
    DbSet<DeliveryConfig> DeliveryConfigs { get; }
    DbSet<PaymentConfig> PaymentConfigs { get; }
    DbSet<BusinessHour> BusinessHours { get; }
    DbSet<Category> Categories { get; }
    DbSet<Product> Products { get; }
    DbSet<ModifierGroup> ModifierGroups { get; }
    DbSet<ModifierOption> ModifierOptions { get; }
    DbSet<AdminUser> AdminUsers { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<PageView> PageViews { get; }
    DbSet<Promotion> Promotions { get; }
    DbSet<PromoRedemption> PromoRedemptions { get; }
    DbSet<Order> Orders { get; }
    DbSet<SuperAdminSettings> SuperAdminSettings { get; }
    DbSet<SetupToken> SetupTokens { get; }
    DbSet<Supplier> Suppliers { get; }
    DbSet<Supply> Supplies { get; }
    DbSet<SupplyPurchase> SupplyPurchases { get; }
    DbSet<SupplierPayment> SupplierPayments { get; }
    DbSet<SupplierPaymentAllocation> SupplierPaymentAllocations { get; }
    DbSet<ProductSupply> ProductSupplies { get; }
    DbSet<InventoryMovement> InventoryMovements { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
