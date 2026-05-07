namespace MorfApp.Application.DTOs.SuperAdmin;

public class SuperAdminSettingsDto
{
    public string Id { get; set; } = string.Empty;
    public string NotificationMessageTemplate { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}
