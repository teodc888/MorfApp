using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Auth;

public record LoginRequest(
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MaxLength(128)] string Password
);
