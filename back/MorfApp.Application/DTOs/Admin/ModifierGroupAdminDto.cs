namespace MorfApp.Application.DTOs.Admin;

public record ModifierGroupAdminDto(
    string Id,
    string Name,
    string Type,
    bool IsRequired,
    int? MaxSelect,
    int SortOrder,
    List<ModifierOptionAdminDto> Options
);

public record ModifierOptionAdminDto(
    string Id,
    string Name,
    string Emoji,
    decimal ExtraPrice,
    int SortOrder,
    bool IsActive
);

public record CreateModifierGroupRequest(
    string Name,
    string Type,
    bool IsRequired,
    int? MaxSelect,
    int SortOrder,
    List<UpsertModifierOptionRequest> Options
);

public record UpdateModifierGroupRequest(
    string Name,
    string Type,
    bool IsRequired,
    int? MaxSelect,
    int SortOrder,
    List<UpsertModifierOptionRequest> Options
);

public record UpsertModifierOptionRequest(
    string? Id,
    string Name,
    string Emoji,
    decimal ExtraPrice,
    int SortOrder
);

public record UpdateProductModifierGroupsRequest(List<string> ModifierGroupIds);
