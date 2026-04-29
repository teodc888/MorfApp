namespace MorfApp.Application.DTOs.Store;

public record CategoryDto(
    string Id,
    string Name,
    string Emoji,
    int SortOrder,
    List<ProductDto> Products
);
