using MorfApp.Domain.Enums;

namespace MorfApp.Domain.Entities;

public class Tenant
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public TenantStatus Status { get; set; } = TenantStatus.Active;
    public TenantPlan Plan { get; set; } = TenantPlan.Basico;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerPhone { get; set; } = string.Empty;
    public string? OwnerEmail { get; set; }
    public string WhatsappNumber { get; set; } = string.Empty;
    public string Timezone { get; set; } = "America/Argentina/Buenos_Aires";
    public string Locale { get; set; } = "es-AR";
    public DateTime? SubscriptionEndsAt { get; set; }
    public string? CustomDomain { get; set; }
    public string? WhatsAppMessageTemplate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public TenantBranding? Branding { get; set; }
    public DeliveryConfig? DeliveryConfig { get; set; }
    public PaymentConfig? PaymentConfig { get; set; }
    public ICollection<BusinessHour> BusinessHours { get; set; } = [];
    public ICollection<Category> Categories { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
    public ICollection<ModifierGroup> ModifierGroups { get; set; } = [];
    public ICollection<AdminUser> AdminUsers { get; set; } = [];
    public ICollection<PageView> PageViews { get; set; } = [];
    public ICollection<Promotion> Promotions { get; set; } = new List<Promotion>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Employee> Employees { get; set; } = [];
}
