using MorfApp.Domain.Enums;

namespace MorfApp.Domain.Entities;

public class ModifierGroup
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public ModifierType Type { get; set; } = ModifierType.Single;
    public bool IsRequired { get; set; }
    public int? MaxSelect { get; set; }
    public int SortOrder { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public ICollection<ModifierOption> Options { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
}
