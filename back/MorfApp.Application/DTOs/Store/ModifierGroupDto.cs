namespace MorfApp.Application.DTOs.Store;

public record ModifierGroupDto(
    string Id,
    string Name,
    string Type,
    bool IsRequired,
    int? MaxSelect,
    List<ModifierOptionDto> Options
);
