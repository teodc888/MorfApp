namespace MorfApp.Application.DTOs.SuperAdmin;

public record SuperAdminTenantDto(
    string Id,
    string Slug,
    string Name,
    string OwnerName,
    string OwnerPhone,
    string Plan,
    string Status,
    DateTime? SubscriptionEndsAt,
    DateTime CreatedAt,
    int AdminCount
);
