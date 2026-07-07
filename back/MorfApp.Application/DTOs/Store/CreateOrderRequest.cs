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
    [System.Text.Json.Serialization.JsonPropertyName("productId")]
    public string? ProductId { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("productName")]
    public string? ProductName { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("qty")]
    public int Quantity { get; set; }

    // Precios legacy — ya no se usan para el cálculo (recalculado server-side),
    // se mantienen por compatibilidad con clientes viejos.
    [System.Text.Json.Serialization.JsonPropertyName("unitPrice")]
    public decimal Price { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("extraPrice")]
    public decimal ExtraPrice { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("modifiers")]
    public List<CreateOrderItemModifierRequest>? Modifiers { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("observations")]
    public string? Observations { get; set; }
}

public class CreateOrderItemModifierRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("optionId")]
    public string? OptionId { get; set; }
}
