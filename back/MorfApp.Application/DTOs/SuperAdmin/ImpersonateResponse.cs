namespace MorfApp.Application.DTOs.SuperAdmin;

public record ImpersonateResponse(
    string AccessToken,
    int ExpiresIn
);
