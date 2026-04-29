namespace MorfApp.Application.DTOs.Store;

public record ProductDto(
    string Id,
    string Name,
    string? Description,
    decimal Price,
    string Emoji,
    string? ImageUrl,
    List<string> Tags,
    List<ModifierGroupDto> ModifierGroups
);
