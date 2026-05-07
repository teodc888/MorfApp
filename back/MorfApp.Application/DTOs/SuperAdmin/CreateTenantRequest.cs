namespace MorfApp.Application.DTOs.SuperAdmin;

public record CreateTenantRequest(
    string Name,
    string Slug,
    string Plan,
    DateTime? SubscriptionEndsAt,
    string OwnerName,
    string OwnerPhone,
    string AdminEmail,
    string AdminPassword
);
