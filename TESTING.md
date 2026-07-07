# Testing MorfApp

## Backend (.NET — xUnit + EF InMemory)

**Requisitos:** Solo .NET 9. No necesita PostgreSQL.

```bash
cd back

# Correr todos los tests
dotnet test MorfApp.Tests/MorfApp.Tests.csproj

# Con detalle de cada test
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --logger "console;verbosity=normal"

# Solo un controlador
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --filter "FullyQualifiedName~AuthController"
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --filter "FullyQualifiedName~AdminController"
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --filter "FullyQualifiedName~StoreController"
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --filter "FullyQualifiedName~OrdersController"
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --filter "FullyQualifiedName~MetricsController"
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --filter "FullyQualifiedName~SuperAdminController"
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --filter "FullyQualifiedName~SupplierController"
dotnet test MorfApp.Tests/MorfApp.Tests.csproj --filter "FullyQualifiedName~SupplyController"
```

### Cobertura actual: 182 tests
- AuthController: login, refresh, logout, setup-password (camino feliz + errores)
- AdminController: me, branding, delivery, hours, payment, categories, products, modifier groups, promotions, product supplies
- StoreController: get tenant, menu, promotions, redemptions, create order
- OrdersController: get (filtros, paginación, búsqueda), confirm (con deducción de inventario), cancel
- MetricsController: daily, weekly, monthly, yearly — totales, promedios, clientes únicos
- SuperAdminController: tenants CRUD, activar, status, reset password, settings
- SupplierController: CRUD, soft delete en cascada, deuda, pagos parciales/totales
- SupplyController: CRUD, compras (stock + deuda), reset stock, movimientos

---

## Frontend (Vitest — tests unitarios)

```bash
cd front
npm install
npm test              # run una vez
npm run test:watch    # modo watch
npm run test:coverage # con cobertura
```

### Tests unitarios:
- `src/__tests__/lib/auth.test.ts` — saveTokens, getAccessToken, clearTokens, isSuperadmin, isPlanPro, etc.
- `src/__tests__/store/cart.test.ts` — addItem, removeItem, updateQty, clear, total(), itemCount()
- `src/__tests__/lib/admin-api.test.ts` — adminFetch (con refresh automático, queue de 401), login

## Frontend (Playwright — E2E)

```bash
cd front

# Instalar browsers la primera vez
npx playwright install

# Configurar credenciales (o usar .env)
export E2E_ADMIN_EMAIL="admin@tutienda.com"
export E2E_ADMIN_PASSWORD="tupassword"
export E2E_TENANT_SLUG="mi-tienda"
export E2E_BASE_URL="http://localhost:3000"  # o https://pre.morfapp.app

# Correr todos los E2E
npm run test:e2e

# Con UI interactiva
npm run test:e2e:ui

# Solo admin
npx playwright test e2e/admin/

# Solo store público
npx playwright test e2e/store/
```

### Tests E2E:
- `e2e/admin/auth.spec.ts` — login inválido, login exitoso, redirección
- `e2e/admin/menu.spec.ts` — CRUD de categorías y productos
- `e2e/admin/orders.spec.ts` — ver pedidos, confirmar, cancelar, buscar
- `e2e/admin/branding.spec.ts` — editar branding
- `e2e/admin/config.spec.ts` — horarios y delivery
- `e2e/store/store.spec.ts` — storefront público: menú, carrito, checkout

---

## SuperAdmin (Vitest — tests unitarios)

```bash
cd superadmin
npm install
npm test
```

### Tests unitarios:
- `src/__tests__/lib/auth.test.ts` — tokens, isSuperadmin
- `src/__tests__/lib/api.test.ts` — adminFetch con refresh
- `src/__tests__/lib/superadmin-api.test.ts` — todos los endpoints + buildWhatsAppNotificationUrl

---

## Variables de entorno para E2E

Crear `front/.env.test` (no commitear):
```
E2E_BASE_URL=http://localhost:3000
E2E_ADMIN_EMAIL=admin@test.com
E2E_ADMIN_PASSWORD=Test1234!
E2E_TENANT_SLUG=demo
```
