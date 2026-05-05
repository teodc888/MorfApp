using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public class SupplierDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public decimal TotalDebt { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateSupplierRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";
    [MaxLength(50)]
    public string? Phone { get; set; }
    [MaxLength(500)]
    public string? Address { get; set; }
    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateSupplierRequest : CreateSupplierRequest { }

public class CreateSupplierPurchasePaymentRequest
{
    [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a 0")]
    public decimal Amount { get; set; }
    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class SupplierDebtDetailDto
{
    public string SupplierId { get; set; } = "";
    public string SupplierName { get; set; } = "";
    public decimal TotalDebt { get; set; }
    public List<SupplierDebtPurchaseDto> Purchases { get; set; } = [];
    public List<SupplierPaymentDto> Payments { get; set; } = [];
}

public class SupplierDebtPurchaseDto
{
    public string PurchaseId { get; set; } = "";
    public string SupplyId { get; set; } = "";
    public string SupplyName { get; set; } = "";
    public decimal TotalPrice { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal PendingAmount { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime PurchaseDate { get; set; }
    public List<SupplierPaymentAllocationDto> Allocations { get; set; } = [];
}

public class SupplierPaymentDto
{
    public string Id { get; set; } = "";
    public string SupplierId { get; set; } = "";
    public string SupplierName { get; set; } = "";
    public decimal Amount { get; set; }
    public string? Notes { get; set; }
    public DateTime PaidAt { get; set; }
    public List<SupplierPaymentAllocationDto> Allocations { get; set; } = [];
}

public class SupplierPaymentAllocationDto
{
    public string PaymentId { get; set; } = "";
    public string PurchaseId { get; set; } = "";
    public string SupplyName { get; set; } = "";
    public decimal Amount { get; set; }
}
