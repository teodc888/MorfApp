namespace MorfApp.Domain.Entities;

public class SupplierPaymentAllocation
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = "";
    public string SupplierPaymentId { get; set; } = "";
    public string SupplyPurchaseId { get; set; } = "";
    public decimal Amount { get; set; }
}
