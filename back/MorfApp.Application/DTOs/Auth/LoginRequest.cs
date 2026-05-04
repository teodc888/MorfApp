using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Auth;

public record LoginRequest(
    [property: Required, EmailAddress, MaxLength(200)] string Email,
    [property: Required, MinLength(6), MaxLength(128)] string Password
);
