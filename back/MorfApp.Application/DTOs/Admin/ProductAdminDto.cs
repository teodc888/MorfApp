namespace MorfApp.Application.DTOs.Admin;

public record ProductAdminDto(
    string Id,
    string CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    List<string> Tags,
    List<string> ModifierGroupIds
);

public record CreateProductRequest(
    string CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    List<string> Tags
);

public record UpdateProductRequest(
    string CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    List<string> Tags
);
