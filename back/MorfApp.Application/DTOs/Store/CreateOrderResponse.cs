namespace MorfApp.Application.DTOs.Store;

public record CreateOrderResponse(
    string OrderId,
    bool Success
);
