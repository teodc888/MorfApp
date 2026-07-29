namespace MorfApp.Application.DTOs.Store;

public record ProductDto(
    string Id,
    string Name,
    string? Description,
    decimal Price,
    decimal? FinalPrice,
    int? DiscountPercent,
    string Emoji,
    List<string> ImageUrls,
    List<string> Tags,
    bool IsOutOfStock,
    List<ModifierGroupDto> ModifierGroups
);
