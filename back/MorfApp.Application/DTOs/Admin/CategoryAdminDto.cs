namespace MorfApp.Application.DTOs.Admin;

public record CategoryAdminDto(
    string Id,
    string Name,
    string? Emoji,
    int SortOrder,
    bool IsActive,
    List<ProductAdminDto> Products
);

public record CreateCategoryRequest(string Name, string? Emoji, int SortOrder);

public record UpdateCategoryRequest(string Name, string? Emoji, int SortOrder, bool IsActive);
