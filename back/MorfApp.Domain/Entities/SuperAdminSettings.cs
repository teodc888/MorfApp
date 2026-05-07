namespace MorfApp.Domain.Entities;

public class SuperAdminSettings
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string NotificationMessageTemplate { get; set; } = "Hola! 👋 Te escribimos desde MorfApp. Tu plan *{plan}* para *{tenantName}* vence el *{expirationDate}*. Para renovar o consultar precios, respondé este mensaje. ¡Gracias!";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
