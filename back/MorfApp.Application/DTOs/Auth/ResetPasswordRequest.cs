using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Auth;

public record ResetPasswordRequest(
    [Required] string Token,
    [Required, MinLength(8, ErrorMessage = "La nueva contraseña debe tener al menos 8 caracteres.")] string NewPassword
);
