using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public record ProductAdminDto(
    string Id,
    string CategoryId,
    string Name,
    string? Description,
    string? Sku,
    decimal Price,
    int? DiscountPercent,
    string Emoji,
    List<string> ImageUrls,
    int SortOrder,
    bool IsActive,
    bool IsOutOfStock,
    List<string> Tags,
    List<string> ModifierGroupIds
);

public record CreateProductRequest(
    [Required] string CategoryId,
    [Required, MinLength(1), MaxLength(200)] string Name,
    [MaxLength(1000)] string? Description,
    [MaxLength(100)] string? Sku,
    [Range(0, 9999999)] decimal Price,
    [MaxLength(10)] string Emoji,
    List<string>? ImageUrls,
    int SortOrder,
    bool IsActive,
    bool IsOutOfStock,
    List<string> Tags
);

public record UpdateProductRequest(
    [Required] string CategoryId,
    [Required, MinLength(1), MaxLength(200)] string Name,
    [MaxLength(1000)] string? Description,
    [MaxLength(100)] string? Sku,
    [Range(0, 9999999)] decimal Price,
    [MaxLength(10)] string Emoji,
    List<string>? ImageUrls,
    int SortOrder,
    bool IsActive,
    bool IsOutOfStock,
    List<string> Tags
);

public record UpdateProductDiscountRequest(
    [Range(0, 100)] int? DiscountPercent
);

public record BulkProductIdsRequest(
    [Required, MinLength(1)] List<string> ProductIds
);

public record BulkUpdateStatusRequest(
    [Required, MinLength(1)] List<string> ProductIds,
    bool IsActive
);

public record BulkMoveCategoryRequest(
    [Required, MinLength(1)] List<string> ProductIds,
    [Required] string CategoryId
);

public record BulkAdjustPriceRequest(
    [Required, MinLength(1)] List<string> ProductIds,
    [Required, RegularExpression("^(percent|fixed)$")] string AdjustType,
    decimal Value
);
