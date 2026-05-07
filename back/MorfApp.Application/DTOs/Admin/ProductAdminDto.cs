using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public record ProductAdminDto(
    string Id,
    string CategoryId,
    string Name,
    string? Description,
    decimal Price,
    int? DiscountPercent,
    string Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    List<string> Tags,
    List<string> ModifierGroupIds
);

public record CreateProductRequest(
    [property: Required] string CategoryId,
    [property: Required, MinLength(1), MaxLength(200)] string Name,
    [property: MaxLength(1000)] string? Description,
    [property: Range(0, 9999999)] decimal Price,
    [property: MaxLength(10)] string Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    List<string> Tags
);

public record UpdateProductRequest(
    [property: Required] string CategoryId,
    [property: Required, MinLength(1), MaxLength(200)] string Name,
    [property: MaxLength(1000)] string? Description,
    [property: Range(0, 9999999)] decimal Price,
    [property: MaxLength(10)] string Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    List<string> Tags
);

public record UpdateProductDiscountRequest(
    [property: Range(0, 100)] int? DiscountPercent
);
