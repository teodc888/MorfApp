using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Public;

public record RegisterInterestRequest(
    [property: Required, MinLength(2), MaxLength(100)] string FirstName,
    [property: Required, MinLength(2), MaxLength(100)] string LastName,
    [property: Required, EmailAddress, MaxLength(200)] string Email,
    [property: Required, MinLength(6), MaxLength(50)] string Phone,
    [property: Required, MinLength(2), MaxLength(200)] string RestaurantName,
    [property: Required] string Plan
);
