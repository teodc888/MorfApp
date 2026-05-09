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
    [Required, MinLength(1), MaxLength(200)] string Name,
    [MaxLength(1000)] string? Description,
    [Range(0, 100)] decimal DiscountPercent,
    [MaxLength(10)] string? Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    [Range(1, 10000)] int? MaxPerUser,
    List<string> ProductIds,
    List<string> ModifierGroupIds);

public record UpdatePromotionRequest(
    [Required, MinLength(1), MaxLength(200)] string Name,
    [MaxLength(1000)] string? Description,
    [Range(0, 100)] decimal DiscountPercent,
    [MaxLength(10)] string? Emoji,
    string? ImageUrl,
    int SortOrder,
    bool IsActive,
    [Range(1, 10000)] int? MaxPerUser);

public record UpdatePromotionProductsRequest(List<string> ProductIds);

public record UpdatePromotionModifierGroupsRequest(List<string> ModifierGroupIds);
