using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.SuperAdmin;

public record UpdateTenantStatusRequest(
    [property: Required] string Status
);
