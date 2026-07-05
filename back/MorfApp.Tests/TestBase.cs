using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using MorfApp.Infrastructure.Persistence;
using System.Security.Claims;

namespace MorfApp.Tests;

/// <summary>
/// Base para todos los tests de controladores.
/// Usa EF InMemory — no requiere PostgreSQL ni red.
/// Cada instancia obtiene una BD aislada con nombre único.
/// </summary>
public abstract class TestBase : IDisposable
{
    protected readonly AppDbContext Db;
    protected readonly string TenantId;

    protected TestBase()
    {
        TenantId = $"tenant-{Guid.NewGuid()}";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"MorfTestDb-{Guid.NewGuid()}")
            .Options;

        Db = new AppDbContext(options);
        Db.Database.EnsureCreated();
    }

    /// <summary>
    /// Crea y persiste un Tenant de prueba con valores mínimos.
    /// Si se omite <paramref name="id"/>, usa <see cref="TenantId"/> (el del test actual).
    /// Cada llamada SIN id explícito que ya existe en el tracker devuelve la entidad cacheada.
    /// </summary>
    protected async Task<Tenant> CreateTenantAsync(
        string? id = null,
        string? slug = null,
        TenantStatus status = TenantStatus.Active,
        TenantPlan plan = TenantPlan.Basico)
    {
        var tenantId = id ?? TenantId;

        // Si ya existe en el tracker o en la BD, devolver la entidad existente
        var tracked = Db.ChangeTracker.Entries<Tenant>()
            .FirstOrDefault(e => e.Entity.Id == tenantId);
        if (tracked is not null)
            return tracked.Entity;

        var existing = await Db.Tenants.FindAsync(tenantId);
        if (existing is not null)
            return existing;

        var tenant = new Tenant
        {
            Id       = tenantId,
            Slug     = slug ?? $"slug-{Guid.NewGuid()}",
            Name     = "Test Tenant",
            Status   = status,
            Plan     = plan,
            Timezone = "America/Argentina/Buenos_Aires",
        };
        Db.Tenants.Add(tenant);
        await Db.SaveChangesAsync();
        return tenant;
    }

    /// <summary>Crea y persiste un AdminUser con BCrypt hash trivial para tests.</summary>
    protected async Task<AdminUser> CreateAdminUserAsync(
        string tenantId,
        string email = "admin@test.com",
        string password = "password123",
        bool isSuperadmin = false)
    {
        var user = new AdminUser
        {
            TenantId      = isSuperadmin ? null : tenantId,
            Email         = email,
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(password),
            IsSuperadmin  = isSuperadmin,
        };
        Db.AdminUsers.Add(user);
        await Db.SaveChangesAsync();
        return user;
    }

    /// <summary>Crea una categoría activa en el tenant.</summary>
    protected async Task<Category> CreateCategoryAsync(string tenantId, string name = "Cat Test", bool isActive = true)
    {
        var cat = new Category { TenantId = tenantId, Name = name, IsActive = isActive };
        Db.Categories.Add(cat);
        await Db.SaveChangesAsync();
        return cat;
    }

    /// <summary>Crea un producto activo en el tenant/categoría dados.</summary>
    protected async Task<Product> CreateProductAsync(string tenantId, string categoryId, string name = "Prod Test", decimal price = 100m)
    {
        var prod = new Product
        {
            TenantId   = tenantId,
            CategoryId = categoryId,
            Name       = name,
            Price      = price,
            IsActive   = true,
            Tags       = [],
        };
        Db.Products.Add(prod);
        await Db.SaveChangesAsync();
        return prod;
    }

    /// <summary>Crea un proveedor activo en el tenant.</summary>
    protected async Task<Supplier> CreateSupplierAsync(string tenantId, string name = "Proveedor Test")
    {
        var supplier = new Supplier { TenantId = tenantId, Name = name, IsActive = true };
        Db.Suppliers.Add(supplier);
        await Db.SaveChangesAsync();
        return supplier;
    }

    /// <summary>Crea un insumo activo en el tenant.</summary>
    protected async Task<Supply> CreateSupplyAsync(string tenantId, string? supplierId = null, string name = "Harina")
    {
        var supply = new Supply { TenantId = tenantId, Name = name, SupplierId = supplierId, IsActive = true };
        Db.Supplies.Add(supply);
        await Db.SaveChangesAsync();
        return supply;
    }

    /// <summary>Crea una orden en el tenant con estado dado.</summary>
    protected async Task<Order> CreateOrderAsync(string tenantId, OrderStatus status = OrderStatus.Pending)
    {
        var order = new Order
        {
            TenantId      = tenantId,
            CustomerName  = "Cliente Test",
            CustomerPhone = "1234567890",
            TotalPrice    = 100m,
            DeliveryMode  = "delivery",
            PaymentMethod = "cash",
            Status        = status,
            Items         = [],
            CreatedAt     = DateTime.UtcNow,
        };
        Db.Orders.Add(order);
        await Db.SaveChangesAsync();
        return order;
    }

    // ── Claims helpers ──────────────────────────────────────────────────────────

    protected static void SetupTenantClaims(ControllerBase controller, string tenantId)
    {
        var claims = new List<Claim>
        {
            new("tenant_id",    tenantId),
            new("is_superadmin","false"),
            new("sub",          Guid.NewGuid().ToString()),
            new("email",        "test@test.com"),
        };
        ApplyClaims(controller, claims);
    }

    protected static void SetupSuperAdminClaims(ControllerBase controller)
    {
        var claims = new List<Claim>
        {
            new("is_superadmin", "true"),
            new("sub",           Guid.NewGuid().ToString()),
            new("email",         "super@test.com"),
        };
        ApplyClaims(controller, claims);
    }

    protected static void SetupNonSuperAdminClaims(ControllerBase controller)
    {
        var claims = new List<Claim>
        {
            new("is_superadmin", "false"),
            new("sub",           Guid.NewGuid().ToString()),
            new("email",         "user@test.com"),
        };
        ApplyClaims(controller, claims);
    }

    private static void ApplyClaims(ControllerBase controller, List<Claim> claims)
    {
        var identity  = new ClaimsIdentity(claims);
        var principal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    public void Dispose()
    {
        Db.Dispose();
        GC.SuppressFinalize(this);
    }
}
