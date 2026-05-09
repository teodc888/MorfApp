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
    [Required, MinLength(1), MaxLength(100)] string Name,
    [MaxLength(10)] string? Emoji,
    int SortOrder
);

public record UpdateCategoryRequest(
    [Required, MinLength(1), MaxLength(100)] string Name,
    [MaxLength(10)] string? Emoji,
    int SortOrder,
    bool IsActive
);
