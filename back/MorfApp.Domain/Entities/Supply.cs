namespace MorfApp.Domain.Entities;

public class Supply
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Unit { get; set; }  // "kg", "litros", "unidades", null = por unidad
    public decimal CurrentStock { get; set; } = 0;
    public string? SupplierId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
