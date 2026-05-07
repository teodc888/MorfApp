using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public class SupplyDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Unit { get; set; }
    public decimal CurrentStock { get; set; }
    public string? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateSupplyRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";
    [MaxLength(50)]
    public string? Unit { get; set; }
    public string? SupplierId { get; set; }
}

public class UpdateSupplyRequest : CreateSupplyRequest { }
