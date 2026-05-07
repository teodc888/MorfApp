using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MorfApp.Application.Interfaces;

namespace MorfApp.Api.Services;

public class EmailService(IConfiguration config) : IEmailService
{
    public async Task SendSetupEmailAsync(string toEmail, string ownerName, string restaurantName, string setupUrl)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(
            config["Email:FromName"] ?? "MorfApp",
            config["Email:FromEmail"]!));
        message.To.Add(new MailboxAddress(ownerName, toEmail));
        message.Subject = $"¡Bienvenido a MorfApp! Configurá tu cuenta de {restaurantName}";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = BuildHtml(ownerName, restaurantName, setupUrl),
            TextBody = $"Hola {ownerName}! Tu cuenta de {restaurantName} fue activada. Ingresá a este link para configurar tu contraseña: {setupUrl}"
        };
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        client.Timeout = 15000;
        await client.ConnectAsync(
            config["Email:SmtpHost"] ?? "smtp.gmail.com",
            config.GetValue<int>("Email:SmtpPort", 587),
            SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(config["Email:Username"]!, config["Email:Password"]!);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    private static string BuildHtml(string ownerName, string restaurantName, string setupUrl) => $"""
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr><td style="background:#c2652a;padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">MorfApp</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Tu menú digital</p>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:22px;">¡Hola, {ownerName}!</h2>
                  <p style="color:#444;line-height:1.6;margin:0 0 16px;">
                    Tu cuenta de <strong>{restaurantName}</strong> en MorfApp fue activada exitosamente.
                    Ya podés comenzar a configurar tu menú digital.
                  </p>
                  <p style="color:#444;line-height:1.6;margin:0 0 32px;">
                    Para ingresar por primera vez, necesitás crear tu contraseña haciendo clic en el botón de abajo:
                  </p>
                  <div style="text-align:center;margin:0 0 32px;">
                    <a href="{setupUrl}" style="display:inline-block;background:#c2652a;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;">
                      Configurar mi contraseña
                    </a>
                  </div>
                  <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 8px;">
                    Este link es válido por <strong>48 horas</strong>. Si no lo usás antes, contactanos para enviarte uno nuevo.
                  </p>
                  <p style="color:#aaa;font-size:12px;margin:0;">
                    Si no solicitaste esta cuenta, podés ignorar este email.
                  </p>
                </td></tr>
                <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
                  <p style="color:#aaa;font-size:12px;margin:0;">© 2025 MorfApp · <a href="https://morfapp.app" style="color:#c2652a;text-decoration:none;">morfapp.app</a></p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
}
