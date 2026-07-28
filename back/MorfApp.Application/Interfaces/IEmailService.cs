namespace MorfApp.Application.Interfaces;

public interface IEmailService
{
    Task SendSetupEmailAsync(string toEmail, string ownerName, string restaurantName, string setupUrl);
    Task SendPasswordResetEmailAsync(string toEmail, string ownerName, string resetUrl);
    Task SendReceiptEmailAsync(string toEmail, string ownerName, string tenantName, decimal amount, DateTime chargedAt, DateTime nextChargeAt);
}
