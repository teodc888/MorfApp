namespace MorfApp.Application.DTOs.Admin;

// ── Response DTOs ─────────────────────────────────────────────────────────────

public record OrderAdminDto(
    string Id,
    string CustomerName,
    string CustomerPhone,
    List<OrderItemDto> Items,
    decimal TotalPrice,
    string DeliveryMode,
    string? Address,
    string? Notes,
    string? PaymentMethod,
    string Status,
    DateTime CreatedAt,
    DateTime? ConfirmedAt
);

public record OrderItemDto(
    string ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    List<OrderItemModifierDto> Modifiers
);

public record OrderItemModifierDto(
    string OptionId,
    string OptionName,
    decimal ExtraPrice
);
