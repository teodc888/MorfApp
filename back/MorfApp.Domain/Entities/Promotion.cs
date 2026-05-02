namespace MorfApp.Domain.Entities;

public class Promotion
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string Emoji { get; set; } = "🎁";
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public int? MaxPerUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public List<string> ProductIds { get; set; } = new();
    public ICollection<ModifierGroup> ModifierGroups { get; set; } = new List<ModifierGroup>();
    public ICollection<PromoRedemption> Redemptions { get; set; } = new List<PromoRedemption>();
}
