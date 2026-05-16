using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public record UpdateTenantRequest(
    [Required, MinLength(1), MaxLength(200)] string Name,
    [Required, MaxLength(50)] string WhatsappNumber
);

public record UpdateBrandingRequest(
    [Required, RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "ColorPrimary debe ser un color hex válido (#RRGGBB)")] string ColorPrimary,
    [Required, RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "ColorAccent debe ser un color hex válido (#RRGGBB)")] string ColorAccent,
    string? LogoUrl,
    string? BannerUrl,
    [MaxLength(200)] string? Tagline,
    [MaxLength(10)] string EmojiIcon
);

public record UpdateDeliveryRequest(
    [Required] string Mode,
    [Range(0, 99999)] decimal? DeliveryCost,
    [Range(0, 99999)] decimal? FreeDeliveryFrom,
    [Range(0, 99999)] decimal? MinOrderAmount,
    [MaxLength(100)] string? EstimatedMinutes,
    [MaxLength(500)] string? PickupAddress
);

public record UpdateHoursRequest(List<HourAdminDto> Hours);

public record UpdateWhatsAppTemplateRequest(
    [MaxLength(2000)] string? Template
);

public record UpdatePaymentRequest(
    bool DeliveryCash,
    bool DeliveryTransfer,
    bool DeliveryCard,
    bool PickupCash,
    bool PickupTransfer,
    bool PickupCard
);
