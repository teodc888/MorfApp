namespace MorfApp.Domain.Entities;

public class PaymentConfig {
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = null!;

    public bool DeliveryCash { get; set; } = true;
    public bool DeliveryTransfer { get; set; } = true;
    public bool DeliveryCard { get; set; } = true;

    public bool PickupCash { get; set; } = true;
    public bool PickupTransfer { get; set; } = true;
    public bool PickupCard { get; set; } = true;

    public Tenant? Tenant { get; set; }
}
