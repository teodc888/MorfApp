using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Public;

public record RegisterInterestRequest(
    [Required, MinLength(2), MaxLength(100)] string FirstName,
    [Required, MinLength(2), MaxLength(100)] string LastName,
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MinLength(6), MaxLength(50)] string Phone,
    [Required, MinLength(2), MaxLength(200)] string RestaurantName,
    [Required] string Plan
);
