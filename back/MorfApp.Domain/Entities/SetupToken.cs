namespace MorfApp.Domain.Entities;

public class SetupToken
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string AdminUserId { get; set; } = string.Empty;
    public string Token { get; set; } = Guid.NewGuid().ToString("N");
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AdminUser AdminUser { get; set; } = null!;
}
