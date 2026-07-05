namespace MorfApp.Application.DTOs.Store;

public record ProductDto(
    string Id,
    string Name,
    string? Description,
    decimal Price,
    decimal? FinalPrice,
    int? DiscountPercent,
    string Emoji,
    string? ImageUrl,
    List<string> Tags,
    bool IsOutOfStock,
    List<ModifierGroupDto> ModifierGroups
);
