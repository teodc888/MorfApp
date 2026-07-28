namespace MorfApp.Application.Interfaces;

public record MpPreapprovalResult(string PreapprovalId, string CheckoutUrl);

public record MpPreapprovalInfo(string Id, string Status, string? PayerEmail);

public record MpPaymentInfo(string Id, string Status, decimal TransactionAmount, DateTime DateApproved, string? ExternalReference);

public interface IMercadoPagoService
{
    // Crea una suscripción (preapproval) contra un preapproval_plan ya existente en Mercado Pago
    // y devuelve la URL hosteada (init_point) donde el usuario carga la tarjeta.
    Task<MpPreapprovalResult> CreateSubscriptionAsync(string preapprovalPlanId, string payerEmail, string externalReference);

    Task<MpPreapprovalInfo> GetPreapprovalAsync(string preapprovalId);

    Task<MpPaymentInfo> GetPaymentAsync(string paymentId);
}
