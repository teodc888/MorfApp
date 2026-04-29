namespace MorfApp.Domain.Entities;

public class Category
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Emoji { get; set; } = "🍽️";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string? AvailableFrom { get; set; }
    public string? AvailableTo { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<Product> Products { get; set; } = [];
}
