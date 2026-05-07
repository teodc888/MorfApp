using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public class SupplyPurchaseDto
{
    public string Id { get; set; } = "";
    public string SupplyId { get; set; } = "";
    public string SupplyName { get; set; } = "";
    public string? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public decimal QuantityPurchased { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal PricePerUnit { get; set; }
    public string? Notes { get; set; }
    public DateTime PurchaseDate { get; set; }
}

public class CreateSupplyPurchaseRequest
{
    [Required]
    public string SupplyId { get; set; } = "";
    [Required]
    public string SupplierId { get; set; } = "";
    [Range(0.0001, double.MaxValue, ErrorMessage = "La cantidad debe ser mayor a 0")]
    public decimal QuantityPurchased { get; set; }
    [Range(0.01, double.MaxValue, ErrorMessage = "El precio debe ser mayor a 0")]
    public decimal TotalPrice { get; set; }
    [MaxLength(1000)]
    public string? Notes { get; set; }
}
