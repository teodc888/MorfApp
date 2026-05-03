using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MorfApp.Application.Interfaces;
using MorfApp.Api;
using MorfApp.Api.Services;
using MorfApp.Infrastructure.Persistence;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// EF Core + PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .UseSnakeCaseNamingConvention());

builder.Services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

// JWT
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// CORS — permite todos los subdominios del ROOT_DOMAIN
var allowedOrigins = builder.Configuration.GetSection("App:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var rootDomain = builder.Configuration["App:RootDomain"] ?? "morfapp.teodc.com";
        policy
            .SetIsOriginAllowed(origin =>
            {
                var uri = new Uri(origin);
                return uri.Host == rootDomain ||
                       uri.Host.EndsWith($".{rootDomain}") ||
                       uri.Host == "localhost";
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 5 * 1024 * 1024;
});

var app = builder.Build();

// Auto-apply pending migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // If tables already exist but migration history is empty, mark existing migrations as applied
    // This handles the case where the DB was created without EF migrations tracking
    var conn = db.Database.GetDbConnection();
    await conn.OpenAsync();
    using (var cmd = conn.CreateCommand())
    {
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                migration_id character varying(150) NOT NULL,
                product_version character varying(32) NOT NULL,
                CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id)
            );
            INSERT INTO ""__EFMigrationsHistory"" (migration_id, product_version)
            SELECT v.id, '9.0.4' FROM (VALUES
                ('20260428030226_InitialCreate'),
                ('20260428032704_AddRefreshTokens'),
                ('20260428180000_AddTenantModifierGroups'),
                ('20260430010813_AddWhatsAppMessageTemplate'),
                ('20260502140646_AddPromotions'),
                ('20260502144208_AddPromotionModifierGroups'),
                ('20260502150059_ConvertPromotionProductsToJson'),
                ('20260502192710_AddProductDiscountPercent'),
                ('20260502201140_AddPaymentConfig'),
                ('20260502220820_AddOrder'),
                ('20260502221445_AddMetricsIndices'),
                ('20260502221541_AddMetricsIndex'),
                ('20260502224653_AddOrderExtraFields')
            ) AS v(id)
            WHERE EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'tenants'
            )
            ON CONFLICT DO NOTHING;
        ";
        await cmd.ExecuteNonQueryAsync();
    }
    await conn.CloseAsync();

    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

var uploadsPath = app.Configuration["App:UploadsPath"];
if (string.IsNullOrWhiteSpace(uploadsPath))
    uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);

app.UseCors();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

// Superadmin seed — runs in all environments
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SuperAdminSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DevelopmentSeeder.SeedAsync(db);
}

app.Run();
