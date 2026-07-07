using System.Runtime.CompilerServices;

// Permite que MorfApp.Tests acceda a miembros "internal" (p. ej. métodos estáticos
// testeables sin dependencias de instancia, como StoreController.IsCurrentlyOpen(hours, nowLocal)
// o WebSocketHandler.ValidateAndExtractTenantId).
[assembly: InternalsVisibleTo("MorfApp.Tests")]
