using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.SuperAdmin;

public record UpdateTenantSuperAdminRequest(
    [MinLength(2), MaxLength(200)] string? OwnerName,
    [MaxLength(50)] string? OwnerPhone,
    DateTime? SubscriptionEndsAt,
    [MinLength(2), MaxLength(200)] string? Name
);
