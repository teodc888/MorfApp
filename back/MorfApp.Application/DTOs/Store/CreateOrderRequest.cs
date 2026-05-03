namespace MorfApp.Application.DTOs.Store;

public class CreateOrderRequest
{
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? DeliveryMode { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public string? PaymentMethod { get; set; }
    public decimal Total { get; set; }
    public List<CreateOrderItemRequest>? Items { get; set; }
}

public class CreateOrderItemRequest
{
    public string? ProductId { get; set; }
    public string? ProductName { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal ExtraPrice { get; set; }
}
