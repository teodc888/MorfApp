using Microsoft.EntityFrameworkCore;
using MorfApp.Domain.Entities;
using MorfApp.Infrastructure.Persistence;

namespace MorfApp.Api;

public static class SuperAdminSeeder
{
    private const string SuperAdminEmail = "super@morfapp.app";
    private const string SuperAdminPassword = "BenjaminyPupi4$";

    public static async Task SeedAsync(AppDbContext db)
    {
        var existing = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == SuperAdminEmail);
        if (existing is not null) return;

        db.AdminUsers.Add(new AdminUser
        {
            Email = SuperAdminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(SuperAdminPassword),
            IsSuperadmin = true,
            TenantId = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();
    }
}
