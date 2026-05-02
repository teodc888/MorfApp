namespace MorfApp.Application.DTOs.Store;

public record TenantPublicDto(
    string Id,
    string Slug,
    string Name,
    string WhatsappNumber,
    string? WhatsAppMessageTemplate,
    bool IsOpen,
    BrandingDto Branding,
    DeliveryConfigDto DeliveryConfig,
    PaymentConfigDto PaymentConfig,
    List<BusinessHourDto> BusinessHours
);

public record BrandingDto(
    string ColorPrimary,
    string ColorAccent,
    string? LogoUrl,
    string? BannerUrl,
    string? Tagline,
    string EmojiIcon
);

public record DeliveryConfigDto(
    string Mode,
    decimal? DeliveryCost,
    decimal? FreeDeliveryFrom,
    decimal? MinOrderAmount,
    string? EstimatedMinutes,
    string? PickupAddress
);

public record BusinessHourDto(
    int DayOfWeek,
    bool IsOpen,
    string? OpensAt,
    string? ClosesAt
);

public record PaymentConfigDto(
    bool DeliveryCash,
    bool DeliveryTransfer,
    bool DeliveryCard,
    bool PickupCash,
    bool PickupTransfer,
    bool PickupCard
);
