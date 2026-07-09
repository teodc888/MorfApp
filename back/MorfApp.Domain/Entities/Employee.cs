namespace MorfApp.Domain.Entities;

public class Employee
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Position { get; set; }

    // "fixed" | "hourly" | "mixed"
    public string RemunerationType { get; set; } = "fixed";
    public decimal BaseSalary { get; set; }
    public decimal HourlyRate { get; set; }

    // "monthly" | "biweekly" | "weekly"
    public string PaymentFrequency { get; set; } = "monthly";
    public int PaymentDay { get; set; } = 1;

    public DateTime HireDate { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Nullable: only set when admin login is activated for this employee
    public string? AdminUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<SalaryPayment> SalaryPayments { get; set; } = [];
    public ICollection<EmployeeAdvance> Advances { get; set; } = [];
}
