namespace MorfApp.Domain.Entities;

public class SalaryPayment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = null!;
    public string EmployeeId { get; set; } = null!;

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    public decimal BasePaid { get; set; }
    public int? HoursWorked { get; set; }
    public decimal HoursAmount { get; set; }
    public decimal AdvancesDeducted { get; set; }
    public decimal Bonus { get; set; }
    public decimal TotalPaid { get; set; }

    public bool IsAguinaldo { get; set; }
    public string? Notes { get; set; }

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Employee Employee { get; set; } = null!;
}
