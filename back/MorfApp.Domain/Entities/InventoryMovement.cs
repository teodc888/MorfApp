namespace MorfApp.Domain.Entities;

public class InventoryMovement
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = "";
    public string SupplyId { get; set; } = "";
    public decimal QuantityChange { get; set; }  // negativo = descuento
    public string Reason { get; set; } = "";  // "Purchase" | "OrderDeducted" | "ManualReset" | "ManualAdjust"
    public string? ReferenceId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
