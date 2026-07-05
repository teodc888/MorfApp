using MorfApp.Api.Services;
using MorfApp.Domain.Enums;
using Xunit;

namespace MorfApp.Tests.Services;

public class SubscriptionExpirationServiceTests : TestBase
{
    [Fact]
    public async Task MarkExpiredTenantsInactiveAsync_TenantExpiredBeyondGracePeriod_MarksInactive()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        tenant.SubscriptionEndsAt = DateTime.UtcNow.AddDays(-(SubscriptionExpirationService.GracePeriodDays + 1));
        await Db.SaveChangesAsync();

        var utcNow = DateTime.UtcNow;
        var count = await SubscriptionExpirationService.MarkExpiredTenantsInactiveAsync(Db, utcNow);

        Assert.Equal(1, count);

        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(TenantStatus.Inactive, updated!.Status);
    }

    [Fact]
    public async Task MarkExpiredTenantsInactiveAsync_TenantExpiredWithinGracePeriod_DoesNotMarkInactive()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        tenant.SubscriptionEndsAt = DateTime.UtcNow.AddDays(-(SubscriptionExpirationService.GracePeriodDays - 1));
        await Db.SaveChangesAsync();

        var utcNow = DateTime.UtcNow;
        var count = await SubscriptionExpirationService.MarkExpiredTenantsInactiveAsync(Db, utcNow);

        Assert.Equal(0, count);

        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(TenantStatus.Active, updated!.Status);
    }

    [Fact]
    public async Task MarkExpiredTenantsInactiveAsync_TenantWithoutSubscriptionEndsAt_IsNotTouched()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        tenant.SubscriptionEndsAt = null;
        await Db.SaveChangesAsync();

        var utcNow = DateTime.UtcNow;
        var count = await SubscriptionExpirationService.MarkExpiredTenantsInactiveAsync(Db, utcNow);

        Assert.Equal(0, count);

        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(TenantStatus.Active, updated!.Status);
    }

    [Fact]
    public async Task MarkExpiredTenantsInactiveAsync_TenantAlreadyInactive_IsNotCountedAgain()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Inactive);
        tenant.SubscriptionEndsAt = DateTime.UtcNow.AddDays(-(SubscriptionExpirationService.GracePeriodDays + 30));
        await Db.SaveChangesAsync();

        var utcNow = DateTime.UtcNow;
        var count = await SubscriptionExpirationService.MarkExpiredTenantsInactiveAsync(Db, utcNow);

        Assert.Equal(0, count);

        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(TenantStatus.Inactive, updated!.Status);
    }
}
