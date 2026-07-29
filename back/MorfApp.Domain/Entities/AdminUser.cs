namespace MorfApp.Domain.Entities;

public class AdminUser
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string? TenantId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsSuperadmin { get; set; }
    // "owner" | "employee"
    public string Role { get; set; } = "owner";
    // Módulos habilitados cuando Role == "employee" (PermissionKeys). Ignorado para owners,
    // que siempre tienen acceso total — ver AuthController.GenerateJwt.
    public List<string> Permissions { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
}
