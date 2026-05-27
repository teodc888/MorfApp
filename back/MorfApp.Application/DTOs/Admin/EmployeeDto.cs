using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public class EmployeeDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Position { get; set; }
    public string RemunerationType { get; set; } = "fixed";
    public decimal BaseSalary { get; set; }
    public decimal HourlyRate { get; set; }
    public string PaymentFrequency { get; set; } = "monthly";
    public int PaymentDay { get; set; }
    public DateTime HireDate { get; set; }
    public bool IsActive { get; set; }
    public bool HasAdminLogin { get; set; }
    public DateTime CreatedAt { get; set; }
    public decimal PendingAdvances { get; set; }
}

public class CreateEmployeeRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(200), EmailAddress]
    public string? Email { get; set; }

    [MaxLength(100)]
    public string? Position { get; set; }

    [Required]
    public string RemunerationType { get; set; } = "fixed";

    [Range(0, double.MaxValue)]
    public decimal BaseSalary { get; set; }

    [Range(0, double.MaxValue)]
    public decimal HourlyRate { get; set; }

    [Required]
    public string PaymentFrequency { get; set; } = "monthly";

    [Range(1, 31)]
    public int PaymentDay { get; set; } = 1;

    public DateTime HireDate { get; set; } = DateTime.UtcNow;
}

public class UpdateEmployeeRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(200), EmailAddress]
    public string? Email { get; set; }

    [MaxLength(100)]
    public string? Position { get; set; }

    [Required]
    public string RemunerationType { get; set; } = "fixed";

    [Range(0, double.MaxValue)]
    public decimal BaseSalary { get; set; }

    [Range(0, double.MaxValue)]
    public decimal HourlyRate { get; set; }

    [Required]
    public string PaymentFrequency { get; set; } = "monthly";

    [Range(1, 31)]
    public int PaymentDay { get; set; } = 1;

    public DateTime HireDate { get; set; }
}

public class SalaryPaymentDto
{
    public string Id { get; set; } = "";
    public string EmployeeId { get; set; } = "";
    public string EmployeeName { get; set; } = "";
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
    public DateTime PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RegisterPaymentRequest
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    [Range(0, double.MaxValue)]
    public decimal BasePaid { get; set; }

    [Range(0, int.MaxValue)]
    public int? HoursWorked { get; set; }

    [Range(0, double.MaxValue)]
    public decimal HoursAmount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Bonus { get; set; }

    public bool IsAguinaldo { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}

public class EmployeeAdvanceDto
{
    public string Id { get; set; } = "";
    public string EmployeeId { get; set; } = "";
    public decimal Amount { get; set; }
    public string? Reason { get; set; }
    public DateTime Date { get; set; }
    public bool IsApplied { get; set; }
    public string? SalaryPaymentId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RegisterAdvanceRequest
{
    public decimal Amount { get; set; }

    [MaxLength(300)]
    public string? Reason { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;
}

public class EmployeePendingDto
{
    public string EmployeeId { get; set; } = "";
    public string EmployeeName { get; set; } = "";
    public string? Position { get; set; }
    public string RemunerationType { get; set; } = "fixed";
    public decimal BaseSalary { get; set; }
    public decimal HourlyRate { get; set; }
    public string PaymentFrequency { get; set; } = "monthly";
    public DateTime NextPaymentDate { get; set; }
    public int DaysUntilPayment { get; set; }
    public decimal PendingAdvances { get; set; }
    public bool AguinaldoDue { get; set; }
    public decimal AguinaldoEstimate { get; set; }
}
