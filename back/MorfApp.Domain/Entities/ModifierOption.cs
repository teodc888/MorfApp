namespace MorfApp.Domain.Entities;

public class ModifierOption
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string GroupId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public decimal ExtraPrice { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ModifierGroup Group { get; set; } = null!;
}
