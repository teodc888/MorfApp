namespace MorfApp.Domain.Entities;

public class ProductSupply
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string SupplyId { get; set; } = "";
    public decimal QuantityRequired { get; set; } = 0;
    public bool IsUnknownQuantity { get; set; } = false;
}
