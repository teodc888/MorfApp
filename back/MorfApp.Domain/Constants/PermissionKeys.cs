namespace MorfApp.Domain.Constants;

public static class PermissionKeys
{
    public const string Orders = "orders";
    public const string Menu = "menu";
    public const string Modifiers = "modifiers";
    public const string Promotions = "promotions";
    public const string Metrics = "metrics";
    public const string Insumos = "insumos";
    public const string Proveedores = "proveedores";

    public static readonly string[] All =
        [Orders, Menu, Modifiers, Promotions, Metrics, Insumos, Proveedores];
}
