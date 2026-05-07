using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.SuperAdmin;

public record UpdateTenantSuperAdminRequest(
    [property: MinLength(2), MaxLength(200)] string? OwnerName,
    [property: MaxLength(50)] string? OwnerPhone,
    DateTime? SubscriptionEndsAt,
    [property: MinLength(2), MaxLength(200)] string? Name
);
