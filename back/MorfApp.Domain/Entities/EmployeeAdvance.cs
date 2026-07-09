namespace MorfApp.Domain.Entities;

public class EmployeeAdvance
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = null!;
    public string EmployeeId { get; set; } = null!;

    // Positive = advance given, negative = discount applied
    public decimal Amount { get; set; }
    public string? Reason { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public bool IsApplied { get; set; }
    public string? SalaryPaymentId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Employee Employee { get; set; } = null!;
}
