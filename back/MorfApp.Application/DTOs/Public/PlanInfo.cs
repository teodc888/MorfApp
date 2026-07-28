namespace MorfApp.Application.DTOs.Public;

public record PlanInfo(string Plan, string DisplayName, decimal MonthlyPriceArs, List<string> Features);

// Catálogo único de precios/planes — fuente de verdad para toda la landing
// (antes vivía hardcodeado e inconsistente en 4 lugares del frontend).
public static class PlanCatalog
{
    public static readonly List<PlanInfo> Plans =
    [
        new("Basico", "Básico", 20000m, [
            "1 local",
            "Menú y productos ilimitados",
            "Pedidos por WhatsApp",
            "Carrito con modificadores",
            "Delivery y takeaway",
            "Subdominio incluido",
        ]),
        new("Pro", "Pro", 45000m, [
            "Todo lo de Básico",
            "Dominio propio",
            "Estadísticas de pedidos",
            "Branding avanzado",
            "Soporte prioritario",
        ]),
        new("Negocio", "Negocio", 60000m, [
            "Todo lo de Pro",
            "Múltiples locales",
            "Gestión de empleados",
            "Control de insumos y proveedores",
        ]),
    ];
}
