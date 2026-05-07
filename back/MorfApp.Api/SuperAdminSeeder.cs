using Microsoft.EntityFrameworkCore;
using MorfApp.Domain.Entities;
using MorfApp.Infrastructure.Persistence;

namespace MorfApp.Api;

public static class SuperAdminSeeder
{
    private const string SuperAdminEmail = "super@morfapp.app";

    public static async Task SeedAsync(AppDbContext db, IConfiguration config, IWebHostEnvironment env)
    {
        var existing = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == SuperAdminEmail);
        if (existing is null)
        {
            var password = config["SuperAdmin:Password"]
                ?? Environment.GetEnvironmentVariable("MORFAPP_SUPERADMIN_PASSWORD");

            if (string.IsNullOrWhiteSpace(password))
            {
                if (env.IsProduction())
                    throw new InvalidOperationException("SuperAdmin:Password es obligatorio para crear el superadmin en producción.");
            }
            else
            {
                db.AdminUsers.Add(new AdminUser
                {
                    Email = SuperAdminEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    IsSuperadmin = true,
                    TenantId = null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }
        }

        var settingsExist = await db.SuperAdminSettings.AnyAsync();
        if (!settingsExist)
            db.SuperAdminSettings.Add(new SuperAdminSettings());

        await db.SaveChangesAsync();
    }
}
