using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Auth;

public record SetupPasswordRequest(
    [property: Required] string Token,
    [property: Required, MinLength(8), MaxLength(128)] string Password
);
