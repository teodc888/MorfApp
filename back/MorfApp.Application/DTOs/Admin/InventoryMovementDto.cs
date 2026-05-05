namespace MorfApp.Application.DTOs.Admin;

public class InventoryMovementDto
{
    public string Id { get; set; } = "";
    public string SupplyId { get; set; } = "";
    public string SupplyName { get; set; } = "";
    public decimal QuantityChange { get; set; }
    public string Reason { get; set; } = "";
    public string? ReferenceId { get; set; }
    public DateTime CreatedAt { get; set; }
}
