using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.SuperAdmin;

public record CreateTenantRequest(
    [Required, MinLength(2), MaxLength(200)] string Name,
    [Required, MinLength(2), MaxLength(50), RegularExpression(@"^[a-z0-9-]+$", ErrorMessage = "Slug solo puede contener letras minúsculas, números y guiones")] string Slug,
    [Required] string Plan,
    DateTime? SubscriptionEndsAt,
    [Required, MinLength(2), MaxLength(200)] string OwnerName,
    [Required, MaxLength(50)] string OwnerPhone,
    [Required, EmailAddress, MaxLength(200)] string AdminEmail,
    [Required, MinLength(8), MaxLength(128)] string AdminPassword
);
