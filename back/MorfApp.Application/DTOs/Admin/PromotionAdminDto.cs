namespace MorfApp.Application.DTOs.Admin;

public record PromotionAdminDto(
    string Id,
    string Name,
    string? Description,
    decimal Price,
    string Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    int? MaxPerUser,
    decimal OriginalPrice,
    decimal DiscountPercent,
    List<string> ProductIds,
    List<string> ModifierGroupIds);

public record CreatePromotionRequest(
    string Name,
    string? Description,
    decimal DiscountPercent,
    string? Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    int? MaxPerUser,
    List<string> ProductIds,
    List<string> ModifierGroupIds);

public record UpdatePromotionRequest(
    string Name,
    string? Description,
    decimal DiscountPercent,
    string? Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    int? MaxPerUser);

public record UpdatePromotionProductsRequest(List<string> ProductIds);

public record UpdatePromotionModifierGroupsRequest(List<string> ModifierGroupIds);
