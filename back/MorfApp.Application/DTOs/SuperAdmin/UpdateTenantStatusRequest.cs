using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.SuperAdmin;

public record UpdateTenantStatusRequest(
    [Required] string Status
);
