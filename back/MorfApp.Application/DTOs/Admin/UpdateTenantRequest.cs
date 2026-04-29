namespace MorfApp.Application.DTOs.Admin;

public record UpdateTenantRequest(string Name, string WhatsappNumber);

public record UpdateBrandingRequest(
    string ColorPrimary,
    string ColorAccent,
    string? LogoUrl,
    string? BannerUrl,
    string? Tagline,
    string EmojiIcon
);

public record UpdateDeliveryRequest(
    string Mode,
    decimal? DeliveryCost,
    decimal? FreeDeliveryFrom,
    decimal? MinOrderAmount,
    string? EstimatedMinutes,
    string? PickupAddress
);

public record UpdateHoursRequest(List<HourAdminDto> Hours);
