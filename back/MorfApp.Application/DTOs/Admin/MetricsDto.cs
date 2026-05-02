namespace MorfApp.Application.DTOs.Admin;

public record MetricsDto(
    int TotalOrders,
    decimal TotalRevenue,
    decimal AverageOrderValue,
    List<TopProductDto> TopProducts,
    List<RevenuePointDto>? RevenueOverTime,
    List<OrdersByHourDto>? OrdersByHour,
    int TotalCustomers
);

public record TopProductDto(
    string ProductId,
    string ProductName,
    int Quantity,
    decimal Revenue
);

public record RevenuePointDto(
    string Label,
    decimal Revenue,
    int Orders
);

public record OrdersByHourDto(
    int Hour,
    int Orders
);
