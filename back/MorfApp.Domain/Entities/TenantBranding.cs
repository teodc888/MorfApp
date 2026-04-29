namespace MorfApp.Domain.Entities;

public class TenantBranding
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string ColorPrimary { get; set; } = "#e8390e";
    public string ColorAccent { get; set; } = "#25D366";
    public string? LogoUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string? Tagline { get; set; }
    public string? Description { get; set; }
    public string EmojiIcon { get; set; } = "🍔";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
}
