using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public record CategoryAdminDto(
    string Id,
    string Name,
    string? Emoji,
    int SortOrder,
    bool IsActive,
    List<ProductAdminDto> Products
);

public record CreateCategoryRequest(
    [property: Required, MinLength(1), MaxLength(100)] string Name,
    [property: MaxLength(10)] string? Emoji,
    int SortOrder
);

public record UpdateCategoryRequest(
    [property: Required, MinLength(1), MaxLength(100)] string Name,
    [property: MaxLength(10)] string? Emoji,
    int SortOrder,
    bool IsActive
);
