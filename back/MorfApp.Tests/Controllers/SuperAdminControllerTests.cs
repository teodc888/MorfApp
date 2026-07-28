using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MorfApp.Api.Controllers;
using MorfApp.Application.DTOs.SuperAdmin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;
using System.IdentityModel.Tokens.Jwt;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class SuperAdminControllerTests : TestBase
{
    private SuperAdminController CreateController(bool asSuperAdmin = true)
    {
        var mockEmail  = new Mock<IEmailService>();
        mockEmail.Setup(e => e.SendSetupEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                 .Returns(Task.CompletedTask);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:FrontendUrl"]   = "https://pre.morfapp.app",
                ["Jwt:Secret"]        = "supersecretkey_atleast32chars_long!!",
                ["Jwt:ExpiryMinutes"] = "15",
            })
            .Build();

        var ctrl = new SuperAdminController(Db, mockEmail.Object, config, NullLogger<SuperAdminController>.Instance, new MorfApp.Api.Services.TenantActivationService(Db));

        if (asSuperAdmin)
            SetupSuperAdminClaims(ctrl);
        else
            SetupNonSuperAdminClaims(ctrl);

        return ctrl;
    }

    // ── GetTenants ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTenants_AsSuperAdmin_ReturnsTenantList()
    {
        await CreateTenantAsync(id: $"ta-{Guid.NewGuid()}", slug: "tenant-a");
        await CreateTenantAsync(id: $"tb-{Guid.NewGuid()}", slug: "tenant-b");

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetTenants();

        var ok   = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SuperAdminTenantDto>>(ok.Value);
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task GetTenants_NotSuperAdmin_ReturnsForbid()
    {
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.GetTenants();

        Assert.IsType<ForbidResult>(result.Result);
    }

    // ── CreateTenant ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateTenant_ValidData_ReturnsCreatedTenant()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.CreateTenant(new CreateTenantRequest(
            "Nuevo Negocio", "nuevo-negocio", "Basico", (DateTime?)null,
            "Dueño Test", "1155667788", "admin@nuevo.com", "Pass1234!"));

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto     = Assert.IsType<SuperAdminTenantDto>(created.Value);
        Assert.Equal("nuevo-negocio", dto.Slug);
        Assert.Equal("Nuevo Negocio",  dto.Name);
    }

    [Fact]
    public async Task CreateTenant_DuplicateSlug_ReturnsBadRequest()
    {
        await CreateTenantAsync(slug: "slug-duplicado");

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.CreateTenant(new CreateTenantRequest(
            "Otro Negocio", "slug-duplicado", "Basico", (DateTime?)null,
            "Dueño", "123", "otro@email.com", "Pass!"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateTenant_DuplicateAdminEmail_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "tenant-email-dup");
        await CreateAdminUserAsync(tenant.Id, "existente@email.com");

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.CreateTenant(new CreateTenantRequest(
            "Otro", "otro-slug", "Basico", (DateTime?)null,
            "Dueño", "123", "existente@email.com", "Pass!"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateTenant_InvalidPlan_ReturnsBadRequest()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.CreateTenant(new CreateTenantRequest(
            "Negocio", "nuevo-slug-plan", "PlanInexistente", null,
            "Dueño", "123", "admin@plan.com", "Pass!"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateTenant_NotSuperAdmin_ReturnsForbid()
    {
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.CreateTenant(new CreateTenantRequest(
            "Negocio", "slug", "Basico", (DateTime?)null, "Dueño", "123", "e@e.com", "pass"));

        Assert.IsType<ForbidResult>(result.Result);
    }

    // ── UpdateTenant ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateTenant_ValidData_ReturnsNoContent()
    {
        var tenant = await CreateTenantAsync(slug: "editable");

        var ctrl   = CreateController(asSuperAdmin: true);
        // UpdateTenantSuperAdminRequest(OwnerName, OwnerPhone, SubscriptionEndsAt, Name, Plan, Slug)
        var result = await ctrl.UpdateTenant(tenant.Id, new UpdateTenantSuperAdminRequest(
            "Dueño Nuevo", "5491155667788", null, "Editado", null, null));

        Assert.IsType<NoContentResult>(result);
        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal("Editado",    updated!.Name);
        Assert.Equal("Dueño Nuevo", updated.OwnerName);
    }

    [Fact]
    public async Task UpdateTenant_SlugWithInvalidChars_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(slug: "original-slug");

        var ctrl   = CreateController(asSuperAdmin: true);
        // OwnerName=null, OwnerPhone=null, SubscriptionEndsAt=null, Name=null, Plan=null, Slug="Slug Inválido Con Espacios!"
        var result = await ctrl.UpdateTenant(tenant.Id, new UpdateTenantSuperAdminRequest(
            null, null, null, null, null, "Slug Inválido Con Espacios!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateTenant_SlugAlreadyTaken_ReturnsBadRequest()
    {
        var tenantA = await CreateTenantAsync(id: $"ta-{Guid.NewGuid()}", slug: "slug-a");
        var tenantB = await CreateTenantAsync(id: $"tb-{Guid.NewGuid()}", slug: "slug-b");

        var ctrl   = CreateController(asSuperAdmin: true);
        // Intentar poner el slug de tenantA en tenantB
        // OwnerName=null, OwnerPhone=null, SubscriptionEndsAt=null, Name=null, Plan=null, Slug="slug-a"
        var result = await ctrl.UpdateTenant(tenantB.Id, new UpdateTenantSuperAdminRequest(
            null, null, null, null, null, "slug-a"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateTenant_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        // Name se pasa como 4to parámetro
        var result = await ctrl.UpdateTenant("nonexistent-id", new UpdateTenantSuperAdminRequest(
            null, null, null, "Test", null, null));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateTenant_NotSuperAdmin_ReturnsForbid()
    {
        var tenant = await CreateTenantAsync();
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.UpdateTenant(tenant.Id, new UpdateTenantSuperAdminRequest("X", null, null, null, null, null)); // OwnerName="X"

        Assert.IsType<ForbidResult>(result);
    }

    // ── UpdateTenantStatus ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateTenantStatus_ValidStatus_UpdatesStatus()
    {
        var tenant = await CreateTenantAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.UpdateTenantStatus(tenant.Id, new UpdateTenantStatusRequest("Suspended"));

        Assert.IsType<NoContentResult>(result);
        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(TenantStatus.Suspended, updated!.Status);
    }

    [Fact]
    public async Task UpdateTenantStatus_InvalidStatus_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.UpdateTenantStatus(tenant.Id, new UpdateTenantStatusRequest("EstadoFicticio"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateTenantStatus_TenantNotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.UpdateTenantStatus("nonexistent", new UpdateTenantStatusRequest("Active"));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateTenantStatus_NotSuperAdmin_ReturnsForbid()
    {
        var tenant = await CreateTenantAsync();
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.UpdateTenantStatus(tenant.Id, new UpdateTenantStatusRequest("Active"));

        Assert.IsType<ForbidResult>(result);
    }

    // ── ResetPassword ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ResetPassword_ValidTenantWithUser_ReturnsSetupUrl()
    {
        var tenant = await CreateTenantAsync();
        await CreateAdminUserAsync(tenant.Id, "admin@test.com");

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ResetPassword(tenant.Id);

        var ok    = Assert.IsType<OkObjectResult>(result);
        dynamic val = ok.Value!;
        Assert.NotNull(val);
    }

    [Fact]
    public async Task ResetPassword_TenantNotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ResetPassword("nonexistent-tenant");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ResetPassword_NoAdminUser_ReturnsNotFound()
    {
        var tenant = await CreateTenantAsync();
        // No creamos usuario admin

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ResetPassword(tenant.Id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ResetPassword_NotSuperAdmin_ReturnsForbid()
    {
        var tenant = await CreateTenantAsync();
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.ResetPassword(tenant.Id);

        Assert.IsType<ForbidResult>(result);
    }

    // ── ActivateTenant ────────────────────────────────────────────────────────────

    [Fact]
    public async Task ActivateTenant_PendingWithOwnerEmail_ActivatesAndReturnsOk()
    {
        var tenant = new Tenant
        {
            Id         = Guid.NewGuid().ToString(),
            Slug       = "pendiente",
            Name       = "Pendiente",
            Status     = TenantStatus.Pending,
            OwnerEmail = "owner@pendiente.com",
            Timezone   = "UTC",
        };
        Db.Tenants.Add(tenant);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ActivateTenant(tenant.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(TenantStatus.Active, updated!.Status);
    }

    [Fact]
    public async Task ActivateTenant_AlreadyActive_ReturnsBadRequest()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ActivateTenant(tenant.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ActivateTenant_NoOwnerEmail_ReturnsBadRequest()
    {
        var tenant = new Tenant
        {
            Id         = Guid.NewGuid().ToString(),
            Slug       = "sin-email",
            Name       = "Sin Email",
            Status     = TenantStatus.Pending,
            OwnerEmail = null, // sin email
            Timezone   = "UTC",
        };
        Db.Tenants.Add(tenant);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ActivateTenant(tenant.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ActivateTenant_TenantNotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ActivateTenant("nonexistent");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ActivateTenant_NotSuperAdmin_ReturnsForbid()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Pending);
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.ActivateTenant(tenant.Id);

        Assert.IsType<ForbidResult>(result);
    }

    // ── ImpersonateTenant ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ImpersonateTenant_NotSuperAdmin_ReturnsForbid()
    {
        var tenant = await CreateTenantAsync();
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.ImpersonateTenant(tenant.Id);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task ImpersonateTenant_TenantNotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ImpersonateTenant("nonexistent-tenant");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task ImpersonateTenant_ValidSuperAdminAndTenant_ReturnsTokenWithExpectedClaims()
    {
        var tenant = await CreateTenantAsync(slug: "tenant-impersonado", plan: TenantPlan.Basico);

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.ImpersonateTenant(tenant.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ImpersonateResponse>(ok.Value);

        Assert.False(string.IsNullOrWhiteSpace(dto.AccessToken));
        Assert.True(dto.ExpiresIn > 0);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(dto.AccessToken);

        Assert.Equal(tenant.Id, jwt.Claims.First(c => c.Type == "tenant_id").Value);
        Assert.Equal(tenant.Slug, jwt.Claims.First(c => c.Type == "tenant_slug").Value);
        Assert.Equal("false", jwt.Claims.First(c => c.Type == "is_superadmin").Value);
        Assert.Equal("true", jwt.Claims.First(c => c.Type == "impersonated").Value);
        Assert.Equal(tenant.Plan.ToString(), jwt.Claims.First(c => c.Type == "tenant_plan").Value);
    }

    [Fact]
    public async Task ImpersonateTenant_DoesNotCreateRefreshToken()
    {
        var tenant = await CreateTenantAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var before = await Db.RefreshTokens.CountAsync();
        var result = await ctrl.ImpersonateTenant(tenant.Id);
        var after  = await Db.RefreshTokens.CountAsync();

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(before, after);
    }

    // ── GetSettings / UpdateSettings ──────────────────────────────────────────────

    [Fact]
    public async Task GetSettings_NoSettingsInDb_ReturnsDefaultSettings()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetSettings();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<SuperAdminSettingsDto>(ok.Value);
    }

    [Fact]
    public async Task UpdateSettings_ValidTemplate_ReturnsNoContent()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.UpdateSettings(new UpdateSuperAdminSettingsRequest { NotificationMessageTemplate = "Hola {tenantName}, tu plan vence el {expirationDate}." });

        Assert.IsType<NoContentResult>(result);

        var settings = Db.SuperAdminSettings.FirstOrDefault();
        Assert.NotNull(settings);
        Assert.Contains("{tenantName}", settings.NotificationMessageTemplate);
    }

    [Fact]
    public async Task UpdateSettings_NotSuperAdmin_ReturnsForbid()
    {
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.UpdateSettings(new UpdateSuperAdminSettingsRequest { NotificationMessageTemplate = "template" });

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetSettings_NotSuperAdmin_ReturnsForbid()
    {
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.GetSettings();

        Assert.IsType<ForbidResult>(result.Result);
    }

    // ── GetDashboard (P1) ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetDashboard_WithoutSuperAdminClaim_ReturnsForbid()
    {
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.GetDashboard();

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetDashboard_ValidShape_ReturnsCorrectCounts()
    {
        await CreateTenantAsync(id: Guid.NewGuid().ToString(), status: TenantStatus.Active);
        await CreateTenantAsync(id: Guid.NewGuid().ToString(), status: TenantStatus.Active);
        await CreateTenantAsync(id: Guid.NewGuid().ToString(), status: TenantStatus.Pending);
        await CreateTenantAsync(id: Guid.NewGuid().ToString(), status: TenantStatus.Inactive);
        await CreateTenantAsync(id: Guid.NewGuid().ToString(), status: TenantStatus.Suspended);

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetDashboard();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SuperAdminDashboardDto>(ok.Value);

        Assert.Equal(2, dto.ActiveTenants);
        Assert.Equal(1, dto.PendingTenants);
        Assert.Equal(1, dto.ExpiredTenants);
        Assert.Equal(1, dto.SuspendedTenants);
    }

    [Fact]
    public async Task GetDashboard_OrdersGroupedByTenant_CountsCorrectly()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        await CreateOrderAsync(tenant.Id);
        await CreateOrderAsync(tenant.Id);

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetDashboard();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SuperAdminDashboardDto>(ok.Value);

        var entry7  = dto.OrdersLast7Days.FirstOrDefault(o => o.TenantId == tenant.Id);
        var entry30 = dto.OrdersLast30Days.FirstOrDefault(o => o.TenantId == tenant.Id);

        Assert.NotNull(entry7);
        Assert.Equal(2, entry7!.OrderCount);
        Assert.NotNull(entry30);
        Assert.Equal(2, entry30!.OrderCount);
    }

    [Fact]
    public async Task GetDashboard_TenantWithoutRecentOrders_AppearsInChurnAlert()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetDashboard();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SuperAdminDashboardDto>(ok.Value);

        var alert = dto.TenantsWithoutRecentOrders.FirstOrDefault(a => a.TenantId == tenant.Id);
        Assert.NotNull(alert);
        Assert.Null(alert!.LastOrderAt);
    }

    [Fact]
    public async Task GetDashboard_TenantWithUpcomingExpiration_AppearsInList()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        tenant.SubscriptionEndsAt = DateTime.UtcNow.AddDays(3);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetDashboard();

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SuperAdminDashboardDto>(ok.Value);

        var expiration = dto.UpcomingExpirations.FirstOrDefault(e => e.TenantId == tenant.Id);
        Assert.NotNull(expiration);
        Assert.True(expiration!.DaysRemaining > 0 && expiration.DaysRemaining <= 4);
    }

    // ── GetErrors ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetErrors_NotSuperAdmin_ReturnsForbid()
    {
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.GetErrors(null, null);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetErrors_ReturnsOrderedByMostRecentFirst()
    {
        Db.ErrorLogs.Add(new ErrorLog { Path = "/a", Method = "GET", ExceptionType = "Exception", Message = "vieja", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) });
        Db.ErrorLogs.Add(new ErrorLog { Path = "/b", Method = "GET", ExceptionType = "Exception", Message = "nueva", CreatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc) });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetErrors(null, null);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ErrorLogListDto>(ok.Value);
        Assert.Equal(2, dto.Total);
        Assert.Equal("nueva", dto.Items[0].Message);
    }

    [Fact]
    public async Task GetErrors_FiltersByResolved()
    {
        Db.ErrorLogs.Add(new ErrorLog { Path = "/a", Method = "GET", ExceptionType = "Exception", Message = "resuelto", IsResolved = true });
        Db.ErrorLogs.Add(new ErrorLog { Path = "/b", Method = "GET", ExceptionType = "Exception", Message = "pendiente", IsResolved = false });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetErrors(resolved: false, tenantId: null);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ErrorLogListDto>(ok.Value);
        Assert.Single(dto.Items);
        Assert.Equal("pendiente", dto.Items[0].Message);
    }

    [Fact]
    public async Task GetErrors_FiltersByTenantId()
    {
        var tenant = await CreateTenantAsync();
        Db.ErrorLogs.Add(new ErrorLog { TenantId = tenant.Id, Path = "/a", Method = "GET", ExceptionType = "Exception", Message = "de este tenant" });
        Db.ErrorLogs.Add(new ErrorLog { TenantId = "otro-tenant", Path = "/b", Method = "GET", ExceptionType = "Exception", Message = "de otro tenant" });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetErrors(resolved: null, tenantId: tenant.Id);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ErrorLogListDto>(ok.Value);
        Assert.Single(dto.Items);
        Assert.Equal("de este tenant", dto.Items[0].Message);
        Assert.Equal(tenant.Name, dto.Items[0].TenantName);
    }

    [Fact]
    public async Task GetErrors_UnresolvedCountIgnoresFilters()
    {
        Db.ErrorLogs.Add(new ErrorLog { Path = "/a", Method = "GET", ExceptionType = "Exception", Message = "1", IsResolved = false });
        Db.ErrorLogs.Add(new ErrorLog { Path = "/b", Method = "GET", ExceptionType = "Exception", Message = "2", IsResolved = false });
        Db.ErrorLogs.Add(new ErrorLog { Path = "/c", Method = "GET", ExceptionType = "Exception", Message = "3", IsResolved = true });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        // Filtro por resuelto=true no debería afectar el conteo total de no-resueltos
        var result = await ctrl.GetErrors(resolved: true, tenantId: null);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ErrorLogListDto>(ok.Value);
        Assert.Equal(2, dto.UnresolvedCount);
    }

    [Fact]
    public async Task GetErrors_Pagination_ReturnsRequestedPage()
    {
        for (int i = 0; i < 5; i++)
            Db.ErrorLogs.Add(new ErrorLog { Path = $"/{i}", Method = "GET", ExceptionType = "Exception", Message = $"msg{i}", CreatedAt = DateTime.UtcNow.AddMinutes(-i) });
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.GetErrors(resolved: null, tenantId: null, page: 2, pageSize: 2);

        var ok  = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ErrorLogListDto>(ok.Value);
        Assert.Equal(5, dto.Total);
        Assert.Equal(2, dto.Items.Count);
    }

    // ── UpdateErrorLog ────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateErrorLog_NotSuperAdmin_ReturnsForbid()
    {
        var ctrl   = CreateController(asSuperAdmin: false);
        var result = await ctrl.UpdateErrorLog("no-existe", new UpdateErrorLogRequest(true));

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task UpdateErrorLog_NotFound_ReturnsNotFound()
    {
        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.UpdateErrorLog("no-existe", new UpdateErrorLogRequest(true));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateErrorLog_MarksResolved()
    {
        var error = new ErrorLog { Path = "/a", Method = "GET", ExceptionType = "Exception", Message = "algo", IsResolved = false };
        Db.ErrorLogs.Add(error);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        var result = await ctrl.UpdateErrorLog(error.Id, new UpdateErrorLogRequest(true));

        Assert.IsType<NoContentResult>(result);
        var updated = await Db.ErrorLogs.FindAsync(error.Id);
        Assert.True(updated!.IsResolved);
    }

    [Fact]
    public async Task UpdateErrorLog_CanReopen()
    {
        var error = new ErrorLog { Path = "/a", Method = "GET", ExceptionType = "Exception", Message = "algo", IsResolved = true };
        Db.ErrorLogs.Add(error);
        await Db.SaveChangesAsync();

        var ctrl   = CreateController(asSuperAdmin: true);
        await ctrl.UpdateErrorLog(error.Id, new UpdateErrorLogRequest(false));

        var updated = await Db.ErrorLogs.FindAsync(error.Id);
        Assert.False(updated!.IsResolved);
    }
}
