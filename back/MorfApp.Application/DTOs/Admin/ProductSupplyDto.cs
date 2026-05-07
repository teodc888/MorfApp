using System.ComponentModel.DataAnnotations;

namespace MorfApp.Application.DTOs.Admin;

public class ProductSupplyDto
{
    public string SupplyId { get; set; } = "";
    public string SupplyName { get; set; } = "";
    public string? Unit { get; set; }
    public decimal QuantityRequired { get; set; }
    public bool IsUnknownQuantity { get; set; }
}

public class UpdateProductSuppliesRequest
{
    public List<ProductSupplyItem> Supplies { get; set; } = new();
}

public class ProductSupplyItem
{
    [Required]
    public string SupplyId { get; set; } = "";
    [Range(0, double.MaxValue)]
    public decimal QuantityRequired { get; set; }
    public bool IsUnknownQuantity { get; set; }
}
