namespace MorfApp.Application.DTOs.Store;

public record ModifierOptionDto(
    string Id,
    string Name,
    string Emoji,
    decimal ExtraPrice
);
