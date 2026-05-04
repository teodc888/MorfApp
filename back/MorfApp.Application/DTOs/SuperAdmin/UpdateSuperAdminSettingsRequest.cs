using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.SuperAdmin;

public class UpdateSuperAdminSettingsRequest
{
    [MaxLength(2000)]
    public string NotificationMessageTemplate { get; set; } = string.Empty;
}
