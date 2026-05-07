using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Auth;

public record SetupPasswordRequest(
    [Required] string Token,
    [Required, MinLength(8), MaxLength(128)] string Password
);
