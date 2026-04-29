namespace MorfApp.Domain.Entities;

public class BusinessHour
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public int DayOfWeek { get; set; }
    public bool IsOpen { get; set; } = true;
    public string? OpensAt { get; set; }
    public string? ClosesAt { get; set; }
    public string? OpensAt2 { get; set; }
    public string? ClosesAt2 { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
