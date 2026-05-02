namespace MorfApp.Domain.Entities;

public class PromoRedemption
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PromotionId { get; set; } = null!;
    public string TenantId { get; set; } = null!;
    public string PhoneNumber { get; set; } = null!;
    public int Quantity { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Promotion Promotion { get; set; } = null!;
}
