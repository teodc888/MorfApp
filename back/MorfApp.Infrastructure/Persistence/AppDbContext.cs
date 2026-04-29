using Microsoft.EntityFrameworkCore;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.Text.Json;

namespace MorfApp.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantBranding> TenantBrandings => Set<TenantBranding>();
    public DbSet<DeliveryConfig> DeliveryConfigs => Set<DeliveryConfig>();
    public DbSet<BusinessHour> BusinessHours => Set<BusinessHour>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ModifierGroup> ModifierGroups => Set<ModifierGroup>();
    public DbSet<ModifierOption> ModifierOptions => Set<ModifierOption>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PageView> PageViews => Set<PageView>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // UseSnakeCaseNamingConvention se configura en DbContextOptionsBuilder (Program.cs / Factory)

        // Tenant
        modelBuilder.Entity<Tenant>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.Slug).IsUnique();
            e.HasIndex(t => t.CustomDomain).IsUnique();
            e.Property(t => t.Status).HasConversion<string>();
        });

        // TenantBranding — one-to-one
        modelBuilder.Entity<TenantBranding>(e =>
        {
            e.HasKey(b => b.Id);
            e.HasOne(b => b.Tenant)
             .WithOne(t => t.Branding)
             .HasForeignKey<TenantBranding>(b => b.TenantId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // DeliveryConfig — one-to-one
        modelBuilder.Entity<DeliveryConfig>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.Mode).HasConversion<string>();
            e.Property(d => d.DeliveryCost).HasPrecision(18, 2);
            e.Property(d => d.FreeDeliveryFrom).HasPrecision(18, 2);
            e.Property(d => d.MinOrderAmount).HasPrecision(18, 2);
            e.HasOne(d => d.Tenant)
             .WithOne(t => t.DeliveryConfig)
             .HasForeignKey<DeliveryConfig>(d => d.TenantId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // BusinessHour — one-to-many
        modelBuilder.Entity<BusinessHour>(e =>
        {
            e.HasKey(b => b.Id);
            e.HasIndex(b => new { b.TenantId, b.DayOfWeek }).IsUnique();
            e.HasOne(b => b.Tenant)
             .WithMany(t => t.BusinessHours)
             .HasForeignKey(b => b.TenantId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Category
        modelBuilder.Entity<Category>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasOne(c => c.Tenant)
             .WithMany(t => t.Categories)
             .HasForeignKey(c => c.TenantId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Product
        modelBuilder.Entity<Product>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Price).HasPrecision(18, 2);
            e.Property(p => p.Tags)
             .HasColumnType("jsonb")
             .HasConversion(
                 v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                 v => JsonSerializer.Deserialize<List<string>>(v, JsonSerializerOptions.Default) ?? new List<string>());
            e.HasOne(p => p.Tenant)
             .WithMany(t => t.Products)
             .HasForeignKey(p => p.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.Category)
             .WithMany(c => c.Products)
             .HasForeignKey(p => p.CategoryId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ModifierGroup — tenant-level, reusable
        modelBuilder.Entity<ModifierGroup>(e =>
        {
            e.HasKey(g => g.Id);
            e.Property(g => g.Type).HasConversion<string>();
            e.HasOne(g => g.Tenant)
             .WithMany(t => t.ModifierGroups)
             .HasForeignKey(g => g.TenantId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Product ↔ ModifierGroup many-to-many
        modelBuilder.Entity<Product>()
            .HasMany(p => p.ModifierGroups)
            .WithMany(g => g.Products)
            .UsingEntity<Dictionary<string, object>>(
                "product_modifier_groups",
                r => r.HasOne<ModifierGroup>().WithMany()
                       .HasForeignKey("modifier_group_id")
                       .OnDelete(DeleteBehavior.Cascade),
                l => l.HasOne<Product>().WithMany()
                       .HasForeignKey("product_id")
                       .OnDelete(DeleteBehavior.Cascade),
                j => j.HasKey("product_id", "modifier_group_id")
            );

        // ModifierOption
        modelBuilder.Entity<ModifierOption>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.ExtraPrice).HasPrecision(18, 2);
            e.HasOne(o => o.Group)
             .WithMany(g => g.Options)
             .HasForeignKey(o => o.GroupId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // AdminUser
        modelBuilder.Entity<AdminUser>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.HasOne(u => u.Tenant)
             .WithMany(t => t.AdminUsers)
             .HasForeignKey(u => u.TenantId)
             .OnDelete(DeleteBehavior.Cascade)
             .IsRequired(false);
        });

        // RefreshToken
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.Token).IsUnique();
            e.HasOne(r => r.AdminUser)
             .WithMany()
             .HasForeignKey(r => r.AdminUserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // PageView
        modelBuilder.Entity<PageView>(e =>
        {
            e.HasKey(v => v.Id);
            e.HasIndex(v => new { v.TenantId, v.Event, v.CreatedAt });
            e.HasOne(v => v.Tenant)
             .WithMany(t => t.PageViews)
             .HasForeignKey(v => v.TenantId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
