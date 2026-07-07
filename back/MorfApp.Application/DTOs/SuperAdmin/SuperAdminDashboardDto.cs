namespace MorfApp.Application.DTOs.SuperAdmin;

public record SuperAdminDashboardDto(
    int ActiveTenants,
    int PendingTenants,
    int ExpiredTenants,
    int SuspendedTenants,
    List<TenantOrderCountDto> OrdersLast7Days,
    List<TenantOrderCountDto> OrdersLast30Days,
    List<ChurnAlertDto> TenantsWithoutRecentOrders,
    List<UpcomingExpirationDto> UpcomingExpirations
);

public record TenantOrderCountDto(string TenantId, string TenantName, int OrderCount);

public record ChurnAlertDto(string TenantId, string TenantName, DateTime? LastOrderAt);

public record UpcomingExpirationDto(string TenantId, string TenantName, DateTime SubscriptionEndsAt, int DaysRemaining);
