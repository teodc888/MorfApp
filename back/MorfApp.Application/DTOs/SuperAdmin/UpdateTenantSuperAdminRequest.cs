namespace MorfApp.Application.DTOs.SuperAdmin;

public record UpdateTenantSuperAdminRequest(
    string? OwnerName,
    string? OwnerPhone,
    DateTime? SubscriptionEndsAt,
    string? Name
);
