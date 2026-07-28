using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using MorfApp.Application.Interfaces;

namespace MorfApp.Api.Services;

public class MercadoPagoService : IMercadoPagoService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public MercadoPagoService(HttpClient http, IConfiguration config)
    {
        _config = config;
        http.BaseAddress = new Uri("https://api.mercadopago.com/");
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", config["MercadoPago:AccessToken"]);
        _http = http;
    }

    public async Task<MpPreapprovalResult> CreateSubscriptionAsync(string preapprovalPlanId, string payerEmail, string externalReference)
    {
        // Se le agrega el externalReference (el Tenant.Id) como query param para que la página
        // de retorno pueda mostrar un resumen personalizado (nombre del negocio, subdominio).
        var baseBackUrl = _config["MercadoPago:BackUrl"] ?? "https://morfapp.app/alta/pendiente";
        var backUrl = $"{baseBackUrl}?ref={Uri.EscapeDataString(externalReference)}";

        var body = new
        {
            preapproval_plan_id = preapprovalPlanId,
            reason = "Suscripción MorfApp",
            external_reference = externalReference,
            payer_email = payerEmail,
            back_url = backUrl,
            status = "pending",
        };

        var response = await _http.PostAsJsonAsync("preapproval", body, JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PreapprovalResponse>(JsonOptions)
            ?? throw new InvalidOperationException("Mercado Pago no devolvió una respuesta válida al crear la suscripción.");

        return new MpPreapprovalResult(result.Id, result.InitPoint);
    }

    public async Task<MpPreapprovalInfo> GetPreapprovalAsync(string preapprovalId)
    {
        var response = await _http.GetAsync($"preapproval/{preapprovalId}");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PreapprovalResponse>(JsonOptions)
            ?? throw new InvalidOperationException("Mercado Pago no devolvió información de la suscripción.");

        return new MpPreapprovalInfo(result.Id, result.Status, result.PayerEmail);
    }

    public async Task<MpPaymentInfo> GetPaymentAsync(string paymentId)
    {
        var response = await _http.GetAsync($"v1/payments/{paymentId}");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PaymentResponse>(JsonOptions)
            ?? throw new InvalidOperationException("Mercado Pago no devolvió información del pago.");

        return new MpPaymentInfo(result.Id.ToString(), result.Status, result.TransactionAmount, result.DateApproved ?? DateTime.UtcNow, result.ExternalReference);
    }

    // DTOs internos de deserialización — reflejan solo los campos que usamos de la respuesta de MP.
    private record PreapprovalResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("init_point")] string InitPoint,
        [property: JsonPropertyName("payer_email")] string? PayerEmail);

    private record PaymentResponse(
        [property: JsonPropertyName("id")] long Id,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("transaction_amount")] decimal TransactionAmount,
        [property: JsonPropertyName("date_approved")] DateTime? DateApproved,
        [property: JsonPropertyName("external_reference")] string? ExternalReference);
}
