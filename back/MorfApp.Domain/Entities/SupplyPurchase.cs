namespace MorfApp.Domain.Entities;

public class SupplyPurchase
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = "";
    public string SupplyId { get; set; } = "";
    public string? SupplierId { get; set; }
    public decimal QuantityPurchased { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal PricePerUnit { get; set; }  // calculado al crear
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
