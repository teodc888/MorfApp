using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MorfApp.Api.Services;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Entities;
using MorfApp.Domain.Enums;

namespace MorfApp.Api.Controllers;

// Recibe las notificaciones de Mercado Pago sobre el ciclo de vida de una suscripción
// (alta/cancelación) y de cada cobro recurrente. Este endpoint es el único disparador
// automático de la activación de un tenant — sin él, "alta automática" sería solo
// "alta manual con un paso extra de pago".
[ApiController]
[Route("api/public/mercadopago")]
[AllowAnonymous]
[EnableRateLimiting("webhook")]
public class MercadoPagoWebhookController(
    IAppDbContext db,
    IMercadoPagoService mercadoPago,
    IEmailService emailService,
    TenantActivationService tenantActivation,
    IConfiguration config,
    ILogger<MercadoPagoWebhookController> logger) : ControllerBase
{
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(
        [FromQuery] string? type,
        [FromQuery(Name = "data.id")] string? dataId)
    {
        if (!IsValidSignature(dataId))
        {
            logger.LogWarning("Webhook de Mercado Pago con firma inválida (type={Type}, dataId={DataId})", type, dataId);
            return Unauthorized();
        }

        if (string.IsNullOrEmpty(type) || string.IsNullOrEmpty(dataId))
            return Ok();

        switch (type)
        {
            case "subscription_preapproval":
                await HandlePreapprovalEvent(dataId);
                break;
            case "subscription_authorized_payment":
                await HandlePaymentEvent(dataId);
                break;
        }

        // Devolver 200 siempre que la firma sea válida — si no, Mercado Pago reintenta indefinidamente.
        return Ok();
    }

    // Esquema documentado por Mercado Pago (manifest "id:{data.id};request-id:{x-request-id};ts:{ts};"
    // firmado con HMAC-SHA256 contra el webhook secret). Verificar contra una notificación real
    // (simulador del panel de MP) antes de ir a producción — el formato puede variar por integración.
    private bool IsValidSignature(string? dataId)
    {
        var secret = config["MercadoPago:WebhookSecret"];
        if (string.IsNullOrEmpty(secret)) return false;

        if (!Request.Headers.TryGetValue("x-signature", out var signatureHeader)) return false;
        if (!Request.Headers.TryGetValue("x-request-id", out var requestIdHeader)) return false;

        var parts = signatureHeader.ToString().Split(',')
            .Select(p => p.Split('=', 2))
            .Where(p => p.Length == 2)
            .ToDictionary(p => p[0].Trim(), p => p[1].Trim());

        if (!parts.TryGetValue("ts", out var ts) || !parts.TryGetValue("v1", out var v1))
            return false;

        var manifest = $"id:{dataId?.ToLowerInvariant()};request-id:{requestIdHeader};ts:{ts};";
        var computed = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(manifest)));

        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(computed), Encoding.UTF8.GetBytes(v1.ToLowerInvariant()));
    }

    private async Task HandlePreapprovalEvent(string preapprovalId)
    {
        await using var tx = await db.BeginTransactionAsync();
        await db.AcquireAdvisoryLockAsync($"mp-preapproval:{preapprovalId}");

        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.MpPreapprovalId == preapprovalId);
        if (tenant is null)
        {
            await tx.RollbackAsync();
            return;
        }

        MpPreapprovalInfo info;
        try
        {
            info = await mercadoPago.GetPreapprovalAsync(preapprovalId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "No se pudo consultar la suscripción {PreapprovalId} en Mercado Pago", preapprovalId);
            await tx.RollbackAsync();
            return;
        }

        if (info.Status == "authorized" && tenant.Status == TenantStatus.Pending)
        {
            var frontendUrl = config["App:FrontendUrl"] ?? "https://morfapp.app";
            var (_, setupUrl) = await tenantActivation.ActivateAsync(tenant, frontendUrl);
            await tx.CommitAsync();

            try
            {
                await emailService.SendSetupEmailAsync(tenant.OwnerEmail!, tenant.OwnerName, tenant.Name, setupUrl);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "No se pudo enviar el email de setup para el tenant {TenantId}", tenant.Id);
            }
        }
        else if (info.Status is "cancelled" or "paused")
        {
            tenant.Status = TenantStatus.Suspended;
            tenant.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        else
        {
            await tx.RollbackAsync();
        }
    }

    private async Task HandlePaymentEvent(string paymentId)
    {
        await using var tx = await db.BeginTransactionAsync();
        await db.AcquireAdvisoryLockAsync($"mp-payment:{paymentId}");

        if (await db.SubscriptionCharges.AnyAsync(c => c.MpPaymentId == paymentId))
        {
            await tx.RollbackAsync();
            return;
        }

        MpPaymentInfo payment;
        try
        {
            payment = await mercadoPago.GetPaymentAsync(paymentId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "No se pudo consultar el pago {PaymentId} en Mercado Pago", paymentId);
            await tx.RollbackAsync();
            return;
        }

        if (payment.Status != "approved" || string.IsNullOrEmpty(payment.ExternalReference))
        {
            await tx.RollbackAsync();
            return;
        }

        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == payment.ExternalReference);
        if (tenant is null)
        {
            await tx.RollbackAsync();
            return;
        }

        var nextChargeAt = payment.DateApproved.AddMonths(1);
        db.SubscriptionCharges.Add(new SubscriptionCharge
        {
            TenantId = tenant.Id,
            MpPaymentId = payment.Id,
            Amount = payment.TransactionAmount,
            Status = payment.Status,
            ChargedAt = payment.DateApproved,
        });
        tenant.SubscriptionEndsAt = nextChargeAt;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        if (!string.IsNullOrEmpty(tenant.OwnerEmail))
        {
            try
            {
                await emailService.SendReceiptEmailAsync(
                    tenant.OwnerEmail, tenant.OwnerName, tenant.Name,
                    payment.TransactionAmount, payment.DateApproved, nextChargeAt);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "No se pudo enviar el email de recibo para el tenant {TenantId}", tenant.Id);
            }
        }
    }
}
