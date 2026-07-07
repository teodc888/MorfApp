namespace MorfApp.Application.DTOs.Admin;

public record TenantInfoDto(
    string Id,
    string Slug,
    string Name,
    string WhatsappNumber,
    string? WhatsAppMessageTemplate,
    string Plan,
    bool IsPaused,
    int? SubscriptionDaysRemaining,
    BrandingAdminDto? Branding,
    DeliveryAdminDto? Delivery,
    PaymentAdminDto? Payment,
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

public record PaymentAdminDto(
    bool DeliveryCash,
    bool DeliveryTransfer,
    bool DeliveryCard,
    bool PickupCash,
    bool PickupTransfer,
    bool PickupCard
);
