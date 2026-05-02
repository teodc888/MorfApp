using MorfApp.Domain.Enums;

namespace MorfApp.Domain.Entities;

public class Order
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = null!;
    public string CustomerName { get; set; } = null!;
    public string CustomerPhone { get; set; } = null!;
    // Items stored as JSONB — snapshot of what was ordered
    public List<OrderItem> Items { get; set; } = new();
    public decimal TotalPrice { get; set; }
    public string DeliveryMode { get; set; } = "delivery";
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public string? PaymentMethod { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConfirmedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
}

// Value objects stored inside the JSONB column — no own DbSet
public class OrderItem
{
    public string ProductId { get; set; } = null!;
    public string ProductName { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public List<OrderItemModifier> Modifiers { get; set; } = new();
}

public class OrderItemModifier
{
    public string OptionId { get; set; } = null!;
    public string OptionName { get; set; } = null!;
    public decimal ExtraPrice { get; set; }
}
