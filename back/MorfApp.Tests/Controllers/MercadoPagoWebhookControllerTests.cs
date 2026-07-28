using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MorfApp.Api.Controllers;
using MorfApp.Api.Services;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Enums;
using Xunit;

namespace MorfApp.Tests.Controllers;

public class MercadoPagoWebhookControllerTests : TestBase
{
    private const string Secret = "test-webhook-secret";

    private Mock<IMercadoPagoService> _mockMp = null!;
    private Mock<IEmailService> _mockEmail = null!;

    private MercadoPagoWebhookController CreateController(bool withValidSecret = true)
    {
        _mockMp = new Mock<IMercadoPagoService>();
        _mockEmail = new Mock<IEmailService>();
        _mockEmail.Setup(e => e.SendSetupEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                  .Returns(Task.CompletedTask);
        _mockEmail.Setup(e => e.SendReceiptEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<DateTime>(), It.IsAny<DateTime>()))
                  .Returns(Task.CompletedTask);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MercadoPago:WebhookSecret"] = withValidSecret ? Secret : null,
                ["App:FrontendUrl"] = "https://morfapp.app",
            })
            .Build();

        return new MercadoPagoWebhookController(
            Db, _mockMp.Object, _mockEmail.Object, new TenantActivationService(Db), config,
            NullLogger<MercadoPagoWebhookController>.Instance);
    }

    // Firma un dataId con el mismo esquema que implementa el controller, para simular una
    // notificación real de Mercado Pago.
    private static void ApplyValidSignature(MercadoPagoWebhookController ctrl, string dataId, string secret = Secret)
    {
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var requestId = Guid.NewGuid().ToString();
        var manifest = $"id:{dataId.ToLowerInvariant()};request-id:{requestId};ts:{ts};";
        var hash = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(manifest)));

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["x-signature"] = $"ts={ts},v1={hash}";
        httpContext.Request.Headers["x-request-id"] = requestId;
        ctrl.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    private static void ApplyNoSignature(MercadoPagoWebhookController ctrl)
    {
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
    }

    // ── Validación de firma ───────────────────────────────────────────────────────

    [Fact]
    public async Task Webhook_MissingHeaders_ReturnsUnauthorized()
    {
        var ctrl = CreateController();
        ApplyNoSignature(ctrl);

        var result = await ctrl.Webhook("subscription_preapproval", "abc");

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Webhook_WrongSecret_ReturnsUnauthorized()
    {
        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "abc", secret: "otro-secreto-distinto");

        var result = await ctrl.Webhook("subscription_preapproval", "abc");

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Webhook_NoSecretConfigured_ReturnsUnauthorized()
    {
        var ctrl = CreateController(withValidSecret: false);
        ApplyValidSignature(ctrl, "abc");

        var result = await ctrl.Webhook("subscription_preapproval", "abc");

        Assert.IsType<UnauthorizedResult>(result);
    }

    // ── subscription_preapproval ──────────────────────────────────────────────────

    [Fact]
    public async Task Webhook_PreapprovalAuthorized_ActivatesPendingTenantAndSendsSetupEmail()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Pending);
        tenant.OwnerEmail = "duenio@test.com";
        tenant.MpPreapprovalId = "preapproval-xyz";
        await Db.SaveChangesAsync();

        _mockMp.Setup(m => m.GetPreapprovalAsync("preapproval-xyz"))
               .ReturnsAsync(new MpPreapprovalInfo("preapproval-xyz", "authorized", "duenio@test.com"));

        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "preapproval-xyz");

        var result = await ctrl.Webhook("subscription_preapproval", "preapproval-xyz");

        Assert.IsType<OkResult>(result);
        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(TenantStatus.Active, updated!.Status);
        Assert.True(Db.AdminUsers.Any(u => u.TenantId == tenant.Id));
        Assert.True(Db.SetupTokens.Any());
        _mockEmail.Verify(e => e.SendSetupEmailAsync("duenio@test.com", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Webhook_PreapprovalCancelled_MarksTenantSuspended()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        tenant.MpPreapprovalId = "preapproval-cancel";
        await Db.SaveChangesAsync();

        _mockMp.Setup(m => m.GetPreapprovalAsync("preapproval-cancel"))
               .ReturnsAsync(new MpPreapprovalInfo("preapproval-cancel", "cancelled", null));

        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "preapproval-cancel");

        await ctrl.Webhook("subscription_preapproval", "preapproval-cancel");

        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(TenantStatus.Suspended, updated!.Status);
    }

    [Fact]
    public async Task Webhook_PreapprovalUnknownTenant_DoesNothingAndReturnsOk()
    {
        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "preapproval-no-existe");

        var result = await ctrl.Webhook("subscription_preapproval", "preapproval-no-existe");

        Assert.IsType<OkResult>(result);
        _mockMp.Verify(m => m.GetPreapprovalAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Webhook_PreapprovalAlreadyActive_DoesNotReactivateOrDuplicateAdminUser()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        tenant.MpPreapprovalId = "preapproval-ya-activo";
        await Db.SaveChangesAsync();

        _mockMp.Setup(m => m.GetPreapprovalAsync("preapproval-ya-activo"))
               .ReturnsAsync(new MpPreapprovalInfo("preapproval-ya-activo", "authorized", null));

        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "preapproval-ya-activo");

        await ctrl.Webhook("subscription_preapproval", "preapproval-ya-activo");

        Assert.False(Db.AdminUsers.Any(u => u.TenantId == tenant.Id));
    }

    // ── subscription_authorized_payment ───────────────────────────────────────────

    [Fact]
    public async Task Webhook_AuthorizedPayment_CreatesChargeUpdatesSubscriptionAndSendsReceipt()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        tenant.OwnerEmail = "duenio@test.com";
        await Db.SaveChangesAsync();

        var chargedAt = new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);
        _mockMp.Setup(m => m.GetPaymentAsync("payment-1"))
               .ReturnsAsync(new MpPaymentInfo("payment-1", "approved", 20000m, chargedAt, tenant.Id));

        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "payment-1");

        var result = await ctrl.Webhook("subscription_authorized_payment", "payment-1");

        Assert.IsType<OkResult>(result);
        var charge = Db.SubscriptionCharges.Single(c => c.MpPaymentId == "payment-1");
        Assert.Equal(tenant.Id, charge.TenantId);
        Assert.Equal(20000m, charge.Amount);

        var updated = await Db.Tenants.FindAsync(tenant.Id);
        Assert.Equal(chargedAt.AddMonths(1), updated!.SubscriptionEndsAt);

        _mockEmail.Verify(e => e.SendReceiptEmailAsync("duenio@test.com", It.IsAny<string>(), It.IsAny<string>(), 20000m, chargedAt, chargedAt.AddMonths(1)), Times.Once);
    }

    [Fact]
    public async Task Webhook_AuthorizedPayment_DuplicateMpPaymentId_DoesNotCreateSecondChargeOrEmail()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);
        tenant.OwnerEmail = "duenio@test.com";
        await Db.SaveChangesAsync();

        Db.SubscriptionCharges.Add(new MorfApp.Domain.Entities.SubscriptionCharge
        {
            TenantId = tenant.Id,
            MpPaymentId = "payment-dup",
            Amount = 20000m,
            Status = "approved",
            ChargedAt = DateTime.UtcNow,
        });
        await Db.SaveChangesAsync();

        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "payment-dup");

        await ctrl.Webhook("subscription_authorized_payment", "payment-dup");

        Assert.Single(Db.SubscriptionCharges.Where(c => c.MpPaymentId == "payment-dup"));
        _mockMp.Verify(m => m.GetPaymentAsync(It.IsAny<string>()), Times.Never);
        _mockEmail.Verify(e => e.SendReceiptEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<DateTime>(), It.IsAny<DateTime>()), Times.Never);
    }

    [Fact]
    public async Task Webhook_AuthorizedPayment_RejectedStatus_DoesNotCreateCharge()
    {
        var tenant = await CreateTenantAsync(status: TenantStatus.Active);

        _mockMp.Setup(m => m.GetPaymentAsync("payment-rejected"))
               .ReturnsAsync(new MpPaymentInfo("payment-rejected", "rejected", 20000m, DateTime.UtcNow, tenant.Id));

        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "payment-rejected");

        await ctrl.Webhook("subscription_authorized_payment", "payment-rejected");

        Assert.False(Db.SubscriptionCharges.Any(c => c.MpPaymentId == "payment-rejected"));
    }

    [Fact]
    public async Task Webhook_AuthorizedPayment_UnknownExternalReference_DoesNotThrow()
    {
        _mockMp.Setup(m => m.GetPaymentAsync("payment-huerfano"))
               .ReturnsAsync(new MpPaymentInfo("payment-huerfano", "approved", 20000m, DateTime.UtcNow, "tenant-que-no-existe"));

        var ctrl = CreateController();
        ApplyValidSignature(ctrl, "payment-huerfano");

        var result = await ctrl.Webhook("subscription_authorized_payment", "payment-huerfano");

        Assert.IsType<OkResult>(result);
        Assert.False(Db.SubscriptionCharges.Any());
    }
}
