using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MorfApp.Application.Interfaces;
using MorfApp.Api;
using MorfApp.Api.Services;
using MorfApp.Infrastructure.Persistence;
using System.Text;
using System.Threading.RateLimiting;

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

builder.Services.AddAuthorization(options =>
{
    // Endpoints que solo el dueño del tenant puede usar (empleados quedan afuera aunque
    // tengan un JWT válido). El claim "role" siempre está presente en tokens de AdminUser.
    // JwtSecurityTokenHandler remapea el claim corto "role" a ClaimTypes.Role al validar
    // el token (igual que "sub" -> ClaimTypes.NameIdentifier, ver AuthController.cs:119),
    // por eso hay que pedirlo por ClaimTypes.Role y no por el string "role" literal.
    options.AddPolicy("OwnerOnly", policy => policy.RequireClaim(System.Security.Claims.ClaimTypes.Role, "owner"));
});

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

// Rate limiting — partición por IP. auth: fuerza bruta en login/reset; public: registro de tenants;
// store: creación de pedidos / redemptions de promos.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));

    options.AddPolicy("public", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 3,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));

    options.AddPolicy("store", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddHostedService<MorfApp.Api.Services.SubscriptionExpirationService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Convierte todos los DateTime entrantes a Kind=Utc (requerido por Npgsql 8+)
        options.JsonSerializerOptions.Converters.Add(new MorfApp.Api.UtcDateTimeConverter());
        options.JsonSerializerOptions.Converters.Add(new MorfApp.Api.UtcNullableDateTimeConverter());
    });

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .SelectMany(e => e.Value!.Errors.Select(err => new { field = e.Key, message = err.ErrorMessage }))
            .ToList();
        return new BadRequestObjectResult(new { errors });
    };
});
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

// WebSocket
builder.Services.AddSingleton<MorfApp.Api.WebSocket.WebSocketConnectionManager>();
builder.Services.AddScoped<MorfApp.Api.WebSocket.WebSocketHandler>();

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

            DELETE FROM ""__EFMigrationsHistory""
            WHERE migration_id = '20260502144208_AddPromotionModifierGroups'
              AND NOT EXISTS (
                  SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'promotion_modifier_groups'
              );

            DELETE FROM ""__EFMigrationsHistory""
            WHERE migration_id = '20260502201140_AddPaymentConfig'
              AND NOT EXISTS (
                  SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'payment_configs'
              );

            DELETE FROM ""__EFMigrationsHistory""
            WHERE migration_id = '20260505161547_AddSuppliersAndInventory'
              AND NOT EXISTS (
                  SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'suppliers'
              );

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'promotions'
                ) THEN
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS description text NULL;
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS price numeric(18,2) NOT NULL DEFAULT 0;
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '🎁';
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url text NULL;
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS max_per_user integer NULL;
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS product_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();
                    ALTER TABLE promotions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
                END IF;
            END $$;
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
app.UseRateLimiter();

// Global exception handler — must ir DESPUÉS de UseCors para que los headers CORS ya estén seteados
// Evita que el browser vea "CORS error" en lugar del verdadero error 500
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Excepción no manejada en {Path}", context.Request.Path);

        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            var payload = app.Environment.IsDevelopment()
                ? System.Text.Json.JsonSerializer.Serialize(new { message = "Error interno del servidor", detail = ex.Message })
                : System.Text.Json.JsonSerializer.Serialize(new { message = "Error interno del servidor" });
            await context.Response.WriteAsync(payload);
        }
    }
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});
app.UseAuthentication();
app.UseAuthorization();

// WebSocket endpoint
app.UseWebSockets();
app.Map("/ws", async (HttpContext context) =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        var handler = context.RequestServices.GetRequiredService<MorfApp.Api.WebSocket.WebSocketHandler>();
        await handler.HandleAsync(context, Guid.NewGuid().ToString());
    }
    else
    {
        context.Response.StatusCode = 400;
    }
});

app.MapControllers();
app.MapHealthChecks("/health");

// Superadmin seed — runs in all environments
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SuperAdminSeeder.SeedAsync(db, app.Configuration, app.Environment);
}

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DevelopmentSeeder.SeedAsync(db);
}

app.Run();
