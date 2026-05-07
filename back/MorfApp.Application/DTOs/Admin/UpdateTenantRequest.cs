using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public record UpdateTenantRequest(
    [property: Required, MinLength(1), MaxLength(200)] string Name,
    [property: Required, MaxLength(50)] string WhatsappNumber
);

public record UpdateBrandingRequest(
    [property: Required, RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "ColorPrimary debe ser un color hex válido (#RRGGBB)")] string ColorPrimary,
    [property: Required, RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "ColorAccent debe ser un color hex válido (#RRGGBB)")] string ColorAccent,
    string? LogoUrl,
    string? BannerUrl,
    [property: MaxLength(200)] string? Tagline,
    [property: MaxLength(10)] string EmojiIcon
);

public record UpdateDeliveryRequest(
    [property: Required] string Mode,
    [property: Range(0, 99999)] decimal? DeliveryCost,
    [property: Range(0, 99999)] decimal? FreeDeliveryFrom,
    [property: Range(0, 99999)] decimal? MinOrderAmount,
    [property: MaxLength(100)] string? EstimatedMinutes,
    [property: MaxLength(500)] string? PickupAddress
);

public record UpdateHoursRequest(List<HourAdminDto> Hours);

public record UpdateWhatsAppTemplateRequest(
    [property: MaxLength(2000)] string? Template
);

public record UpdatePaymentRequest(
    bool DeliveryCash,
    bool DeliveryTransfer,
    bool DeliveryCard,
    bool PickupCash,
    bool PickupTransfer,
    bool PickupCard
);
