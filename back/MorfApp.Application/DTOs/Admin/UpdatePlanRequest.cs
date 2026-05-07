using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public record UpdatePlanRequest(
    [property: Required] string Plan
);
