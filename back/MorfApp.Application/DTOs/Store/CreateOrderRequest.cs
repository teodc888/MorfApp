using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Store;

public record CreateOrderRequest(
    [property: Required] List<CreateOrderItemRequest> Items,
    [property: Required, MinLength(2), MaxLength(200)] string CustomerName,
    [property: Required, MinLength(6), MaxLength(50)] string CustomerPhone,
    [property: Required] string DeliveryMode,
    [property: MaxLength(500)] string? Address,
    [property: MaxLength(1000)] string? Notes,
    [property: MaxLength(50)] string? PaymentMethod,
    [property: Range(0, 9999999)] decimal Total
);

public record CreateOrderItemRequest(
    [property: Required] string ProductId,
    [property: Required] string ProductName,
    [property: Range(1, 999)] int Quantity,
    [property: Range(0, 9999999)] decimal Price,
    [property: Range(0, 9999999)] decimal ExtraPrice
);
