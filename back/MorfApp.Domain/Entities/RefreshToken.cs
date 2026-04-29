namespace MorfApp.Domain.Entities;

public class RefreshToken
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string AdminUserId { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AdminUser AdminUser { get; set; } = null!;
}
