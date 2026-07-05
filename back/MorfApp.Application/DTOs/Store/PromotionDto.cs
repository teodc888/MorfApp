using MorfApp.Domain.Entities;

namespace MorfApp.Application.DTOs.Store;

public record PromotionDto(
    string Id,
    string Name,
    string? Description,
    decimal Price,
    string Emoji,
    string? ImageUrl,
    int SortOrder,
    int? MaxPerUser,
    decimal OriginalPrice,
    decimal DiscountPercent,
    List<ProductDto> Products,
    List<ModifierGroupDto> ModifierGroups);

public record RedemptionStatusDto(int Used, int? MaxPerUser, bool CanRedeem);
