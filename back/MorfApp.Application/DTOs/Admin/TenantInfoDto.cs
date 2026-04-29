namespace MorfApp.Application.DTOs.Admin;

public record TenantInfoDto(
    string Id,
    string Slug,
    string Name,
    string WhatsappNumber,
    BrandingAdminDto? Branding,
    DeliveryAdminDto? Delivery,
    List<HourAdminDto> Hours
);

public record BrandingAdminDto(
    string ColorPrimary,
    string ColorAccent,
    string? LogoUrl,
    string? BannerUrl,
    string? Tagline,
    string EmojiIcon
);

public record DeliveryAdminDto(
    string Mode,
    decimal? DeliveryCost,
    decimal? FreeDeliveryFrom,
    decimal? MinOrderAmount,
    string? EstimatedMinutes,
    string? PickupAddress
);

public record HourAdminDto(int DayOfWeek, bool IsOpen, string? OpensAt, string? ClosesAt);
