using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.SuperAdmin;

public record CreateTenantRequest(
    [property: Required, MinLength(2), MaxLength(200)] string Name,
    [property: Required, MinLength(2), MaxLength(50), RegularExpression(@"^[a-z0-9-]+$", ErrorMessage = "Slug solo puede contener letras minúsculas, números y guiones")] string Slug,
    [property: Required] string Plan,
    DateTime? SubscriptionEndsAt,
    [property: Required, MinLength(2), MaxLength(200)] string OwnerName,
    [property: Required, MaxLength(50)] string OwnerPhone,
    [property: Required, EmailAddress, MaxLength(200)] string AdminEmail,
    [property: Required, MinLength(8), MaxLength(128)] string AdminPassword
);
