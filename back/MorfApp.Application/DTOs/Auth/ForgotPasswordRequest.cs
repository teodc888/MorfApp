using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Auth;

public record ForgotPasswordRequest([Required, EmailAddress] string Email);
