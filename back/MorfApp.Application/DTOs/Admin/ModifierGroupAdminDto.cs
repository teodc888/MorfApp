using System.ComponentModel.DataAnnotations;

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
    [property: Required, MinLength(1), MaxLength(100)] string Name,
    [property: Required] string Type,
    bool IsRequired,
    [property: Range(1, 100)] int? MaxSelect,
    int SortOrder,
    List<UpsertModifierOptionRequest> Options
);

public record UpdateModifierGroupRequest(
    [property: Required, MinLength(1), MaxLength(100)] string Name,
    [property: Required] string Type,
    bool IsRequired,
    [property: Range(1, 100)] int? MaxSelect,
    int SortOrder,
    List<UpsertModifierOptionRequest> Options
);

public record UpsertModifierOptionRequest(
    string? Id,
    [property: Required, MinLength(1), MaxLength(100)] string Name,
    [property: MaxLength(10)] string Emoji,
    [property: Range(0, 99999)] decimal ExtraPrice,
    int SortOrder
);

public record UpdateProductModifierGroupsRequest(List<string> ModifierGroupIds);
