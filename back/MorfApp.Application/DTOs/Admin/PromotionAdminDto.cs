using System.ComponentModel.DataAnnotations;

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
    [property: Required, MinLength(1), MaxLength(200)] string Name,
    [property: MaxLength(1000)] string? Description,
    [property: Range(0, 100)] decimal DiscountPercent,
    [property: MaxLength(10)] string? Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    [property: Range(1, 10000)] int? MaxPerUser,
    List<string> ProductIds,
    List<string> ModifierGroupIds);

public record UpdatePromotionRequest(
    [property: Required, MinLength(1), MaxLength(200)] string Name,
    [property: MaxLength(1000)] string? Description,
    [property: Range(0, 100)] decimal DiscountPercent,
    [property: MaxLength(10)] string? Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    [property: Range(1, 10000)] int? MaxPerUser);

public record UpdatePromotionProductsRequest(List<string> ProductIds);

public record UpdatePromotionModifierGroupsRequest(List<string> ModifierGroupIds);
