using MorfApp.Domain.Enums;

namespace MorfApp.Domain.Entities;

public class DeliveryConfig
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public DeliveryMode Mode { get; set; } = DeliveryMode.Both;
    public decimal? DeliveryCost { get; set; }
    public decimal? FreeDeliveryFrom { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public string? EstimatedMinutes { get; set; }
    public string? PickupAddress { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
}
