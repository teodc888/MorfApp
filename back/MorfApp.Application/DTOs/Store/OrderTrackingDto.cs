namespace MorfApp.Application.DTOs.Store;

public record OrderTrackingDto(
    string Id,
    string Status,
    List<OrderTrackingItemDto> Items,
    decimal TotalPrice,
    string DeliveryMode,
    string? Address,
    string? EstimatedMinutes,
    string CustomerName,
    string CustomerPhoneMasked,
    DateTime CreatedAt,
    DateTime? ConfirmedAt
);

public record OrderTrackingItemDto(
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    List<OrderTrackingModifierDto> Modifiers,
    string? Observations
);

public record OrderTrackingModifierDto(
    string OptionName,
    decimal ExtraPrice
);
