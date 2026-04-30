using Microsoft.EntityFrameworkCore;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using MorfApp.Infrastructure.Persistence;

namespace MorfApp.Api;

public static class DevelopmentSeeder
{
    public const string TenantSlug = "dev";
    public const string AdminEmail = "admin@dev.morfapp.app";
    public const string AdminPassword = "Admin123!";

    private const string TenantId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d111";
    private const string BrandingId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d112";
    private const string DeliveryConfigId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d113";
    private const string CategoryBurgersId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d121";
    private const string CategoryDrinksId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d122";
    private const string ProductClassicId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d131";
    private const string ProductDoubleId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d132";
    private const string ProductSodaId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d133";
    private const string AdminUserId = "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d141";

    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.MigrateAsync();

        var now = DateTime.UtcNow;

        var tenant = await db.Tenants
            .Include(t => t.Branding)
            .Include(t => t.DeliveryConfig)
            .FirstOrDefaultAsync(t => t.Slug == TenantSlug);

        if (tenant is null)
        {
            tenant = new Tenant
            {
                Id = TenantId,
                Slug = TenantSlug,
                Name = "Dev Store",
                Status = TenantStatus.Active,
                WhatsappNumber = "5491112345678",
                Timezone = "America/Argentina/Buenos_Aires",
                Locale = "es-AR",
                WhatsAppMessageTemplate = "Hola! Te paso el pedido de Dev Store.",
                CreatedAt = now,
                UpdatedAt = now,
            };

            db.Tenants.Add(tenant);
        }
        else
        {
            tenant.Name = "Dev Store";
            tenant.Status = TenantStatus.Active;
            tenant.WhatsappNumber = "5491112345678";
            tenant.Timezone = "America/Argentina/Buenos_Aires";
            tenant.Locale = "es-AR";
            tenant.WhatsAppMessageTemplate = "Hola! Te paso el pedido de Dev Store.";
            tenant.UpdatedAt = now;
        }

        var branding = await db.TenantBrandings.FirstOrDefaultAsync(b => b.TenantId == tenant.Id);
        if (branding is null)
        {
            db.TenantBrandings.Add(new TenantBranding
            {
                Id = BrandingId,
                TenantId = tenant.Id,
                ColorPrimary = "#e8390e",
                ColorAccent = "#25D366",
                Tagline = "Hamburguesas demo para revisar responsive",
                Description = "Tenant de desarrollo para probar el front y el admin",
                EmojiIcon = "🍔",
                UpdatedAt = now,
            });
        }
        else
        {
            branding.ColorPrimary = "#e8390e";
            branding.ColorAccent = "#25D366";
            branding.Tagline = "Hamburguesas demo para revisar responsive";
            branding.Description = "Tenant de desarrollo para probar el front y el admin";
            branding.EmojiIcon = "🍔";
            branding.UpdatedAt = now;
        }

        var delivery = await db.DeliveryConfigs.FirstOrDefaultAsync(d => d.TenantId == tenant.Id);
        if (delivery is null)
        {
            db.DeliveryConfigs.Add(new DeliveryConfig
            {
                Id = DeliveryConfigId,
                TenantId = tenant.Id,
                Mode = DeliveryMode.Both,
                DeliveryCost = 500,
                FreeDeliveryFrom = 5000,
                MinOrderAmount = 2500,
                EstimatedMinutes = "35-50",
                PickupAddress = "Av. Siempre Viva 123",
                UpdatedAt = now,
            });
        }
        else
        {
            delivery.Mode = DeliveryMode.Both;
            delivery.DeliveryCost = 500;
            delivery.FreeDeliveryFrom = 5000;
            delivery.MinOrderAmount = 2500;
            delivery.EstimatedMinutes = "35-50";
            delivery.PickupAddress = "Av. Siempre Viva 123";
            delivery.UpdatedAt = now;
        }

        await UpsertBusinessHourAsync(db, tenant.Id, 0, true, "10:00", "23:30");
        await UpsertBusinessHourAsync(db, tenant.Id, 1, true, "10:00", "23:30");
        await UpsertBusinessHourAsync(db, tenant.Id, 2, true, "10:00", "23:30");
        await UpsertBusinessHourAsync(db, tenant.Id, 3, true, "10:00", "23:30");
        await UpsertBusinessHourAsync(db, tenant.Id, 4, true, "10:00", "00:00");
        await UpsertBusinessHourAsync(db, tenant.Id, 5, true, "11:00", "00:00");
        await UpsertBusinessHourAsync(db, tenant.Id, 6, true, "11:00", "23:30");

        var burgers = await UpsertCategoryAsync(db, tenant.Id, CategoryBurgersId, "Hamburguesas", "🍔", 0);
        var drinks = await UpsertCategoryAsync(db, tenant.Id, CategoryDrinksId, "Bebidas", "🥤", 1);

        await UpsertProductAsync(
            db,
            tenant.Id,
            ProductClassicId,
            burgers.Id,
            "Clásica",
            "Carne, queso, tomate y lechuga",
            4200,
            "🍔",
            0);

        await UpsertProductAsync(
            db,
            tenant.Id,
            ProductDoubleId,
            burgers.Id,
            "Doble Cheddar",
            "Doble medallón, cheddar y salsa especial",
            5600,
            "🍔",
            1);

        await UpsertProductAsync(
            db,
            tenant.Id,
            ProductSodaId,
            drinks.Id,
            "Gaseosa",
            "Lata 354 ml",
            1800,
            "🥤",
            0);

        var admin = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == AdminEmail);
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(AdminPassword);

        if (admin is null)
        {
            db.AdminUsers.Add(new AdminUser
            {
                Id = AdminUserId,
                TenantId = tenant.Id,
                Email = AdminEmail,
                PasswordHash = passwordHash,
                IsSuperadmin = false,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        else
        {
            admin.TenantId = tenant.Id;
            admin.PasswordHash = passwordHash;
            admin.IsSuperadmin = false;
            admin.UpdatedAt = now;
        }

        await db.SaveChangesAsync();
    }

    private static async Task UpsertBusinessHourAsync(
        AppDbContext db,
        string tenantId,
        int dayOfWeek,
        bool isOpen,
        string opensAt,
        string closesAt)
    {
        var existing = await db.BusinessHours.FirstOrDefaultAsync(h => h.TenantId == tenantId && h.DayOfWeek == dayOfWeek);
        if (existing is null)
        {
            db.BusinessHours.Add(new BusinessHour
            {
                TenantId = tenantId,
                DayOfWeek = dayOfWeek,
                IsOpen = isOpen,
                OpensAt = opensAt,
                ClosesAt = closesAt,
            });
            return;
        }

        existing.IsOpen = isOpen;
        existing.OpensAt = opensAt;
        existing.ClosesAt = closesAt;
    }

    private static async Task<Category> UpsertCategoryAsync(
        AppDbContext db,
        string tenantId,
        string categoryId,
        string name,
        string emoji,
        int sortOrder)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == categoryId || (c.TenantId == tenantId && c.Name == name));
        if (category is null)
        {
            category = new Category
            {
                Id = categoryId,
                TenantId = tenantId,
                Name = name,
                Emoji = emoji,
                SortOrder = sortOrder,
                IsActive = true,
            };
            db.Categories.Add(category);
        }
        else
        {
            category.TenantId = tenantId;
            category.Name = name;
            category.Emoji = emoji;
            category.SortOrder = sortOrder;
            category.IsActive = true;
        }

        return category;
    }

    private static async Task UpsertProductAsync(
        AppDbContext db,
        string tenantId,
        string productId,
        string categoryId,
        string name,
        string description,
        decimal price,
        string emoji,
        int sortOrder)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId || (p.TenantId == tenantId && p.Name == name));
        if (product is null)
        {
            db.Products.Add(new Product
            {
                Id = productId,
                TenantId = tenantId,
                CategoryId = categoryId,
                Name = name,
                Description = description,
                Price = price,
                Emoji = emoji,
                SortOrder = sortOrder,
                IsActive = true,
                Tags = [],
            });
            return;
        }

        product.TenantId = tenantId;
        product.CategoryId = categoryId;
        product.Name = name;
        product.Description = description;
        product.Price = price;
        product.Emoji = emoji;
        product.SortOrder = sortOrder;
        product.IsActive = true;
        product.Tags = [];
        product.UpdatedAt = DateTime.UtcNow;
    }
}
