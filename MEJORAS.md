# MEJORAS.md — Backlog de auditoría MorfApp

> Generado a partir de la auditoría completa del 2026-07-04 (back / front / superadmin).
> Cada ítem tiene: prioridad, esfuerzo estimado, archivos involucrados y criterio de aceptación.
> **Instrucciones para el agente que implemente**: trabajar de a UN ítem por vez, en orden de fase.
> Cada ítem debe incluir sus tests (xUnit en `back/MorfApp.Tests/`, vitest/playwright en front).
> Respetar las convenciones de `CLAUDE.md`: TenantId en todo endpoint admin, mappers estáticos,
> IAppDbContext directo, IDs string GUID, snake_case en DB, español en la UI.

**Leyenda**: 🔴 crítica · 🟠 alta · 🟡 media · 🟢 baja · Esfuerzo: S (<½ día) / M (½–1 día) / L (1–3 días)

---

## FASE 1 — Seguridad y bugs críticos (backend)

### S1 🔴 [M] Recalcular precios server-side en CreateOrder
- **Archivos**: `back/MorfApp.Api/Controllers/StoreController.cs:278-295`, `back/MorfApp.Application/DTOs/Store/CreateOrderRequest.cs`
- **Problema**: el backend acepta `unitPrice`, `extraPrice` y `total` tal como los manda el browser. Cualquiera con curl crea pedidos a $1 y corrompe métricas e inventario. Tampoco valida que `ProductId` exista ni pertenezca al tenant.
- **Solución**: buscar los productos en DB (con `ModifierGroups.Options`), validar que existen, están activos y son del tenant; recalcular `UnitPrice` = precio DB (aplicando `DiscountPercent`) + suma de `ExtraPrice` de opciones válidas; recalcular `TotalPrice` server-side incluyendo costo de envío según `DeliveryConfig`. Los items con id `promo:<id>` se validan contra `Promotions` (precio = `promo.Price`). Rechazar con 400 si algo no cuadra.
- **Aceptación**: test que manda `total: 1` con productos de $5000 y verifica que el pedido se guarda con el total real. Test de producto de otro tenant → 400.

### S2 🔴 [S] Validar firma del JWT en el WebSocket
- **Archivos**: `back/MorfApp.Api/WebSocket/WebSocketHandler.cs:63-75`
- **Problema**: `ReadJwtToken` solo decodifica, no valida firma ni expiración. Un JWT forjado con el `tenant_id` de otro comercio recibe sus pedidos en tiempo real (nombres y teléfonos de clientes).
- **Solución**: usar `JwtSecurityTokenHandler.ValidateToken` con los mismos `TokenValidationParameters` de `Program.cs:25-32` (misma key, `ValidateLifetime = true`, `ClockSkew = Zero`). Si falla → 401.
- **Aceptación**: test con token sin firmar → rechazado; token válido → conecta.

### S3 🟠 [M] Rate limiting en endpoints sensibles
- **Archivos**: `back/MorfApp.Api/Program.cs`, `AuthController.cs`, `PublicController.cs`, `StoreController.cs`
- **Problema**: cero rate limiting. Login con fuerza bruta ilimitada; `POST /api/public/register` crea tenants sin auth ni límite; redemptions públicas abusables.
- **Solución**: `AddRateLimiter` de .NET 9 con partición por IP. Políticas: `auth` (5 req/min) para login/refresh/setup-password, `public` (3 req/min) para register, `store` (30 req/min) para creación de pedidos y redemptions. `app.UseRateLimiter()` después de `UseCors`.
- **Aceptación**: 6º intento de login en un minuto → 429.

### S4 🟠 [S] No exponer `ex.Message` al cliente + logging real
- **Archivos**: `back/MorfApp.Api/Program.cs:191-211`, `AuthController.cs:35-38`, `StoreController.cs:316-319`, `WebSocket/WebSocketConnectionManager.cs:43`
- **Problema**: el handler global devuelve `detail = ex.Message` (puede filtrar SQL, rutas, connection info) y no loguea nada. Los catch de Auth/Store silencian excepciones. `Console.WriteLine` en el WS manager.
- **Solución**: en el handler global, loguear con `ILogger` (obtenerlo del `RequestServices`) y devolver `detail` solo si `app.Environment.IsDevelopment()`. Inyectar `ILogger<T>` en los controllers con catch y loguear antes de responder. Reemplazar `Console.WriteLine`.
- **Aceptación**: en Production una excepción devuelve `{ message }` sin detail y aparece en el log.

### S5 🟠 [M] Hashear refresh tokens en DB
- **Archivos**: `back/MorfApp.Api/Controllers/AuthController.cs:41-55, 91-107`
- **Problema**: los refresh tokens (7 días de vida) se guardan en texto plano. Un dump de DB = secuestro de sesión de todos los admins.
- **Solución**: guardar `SHA256(token)` en `RefreshTokens.Token`; en `Refresh`/`Logout` hashear el token entrante antes de buscar. Bonus: si llega un token ya revocado, revocar todos los tokens del usuario (detección de robo).
- **Aceptación**: la fila en DB no coincide con el token que recibe el cliente; el flujo refresh sigue funcionando (tests existentes de `AuthControllerTests` actualizados).

### S6 🟠 [S] El CI no corre ningún test
- **Archivos**: `Jenkinsfile.pre`, `Jenkinsfile.prod`
- **Problema**: existen ~190 tests xUnit + vitest + Playwright y ninguno se ejecuta en el pipeline. Se deploya a PRE/PROD sin validación.
- **Solución**: agregar stage `Test` antes de los build: `dotnet test back/` y `npm run test` en `front/` y `superadmin/` (vitest; Playwright puede quedar fuera del pipeline por ahora). Si fallan, el pipeline corta.
- **Aceptación**: un test roto hace fallar el build de Jenkins.

### S7 🟡 [M] Endurecer CreateOrder y DTOs con validación de entrada
- **Archivos**: `back/MorfApp.Application/DTOs/Store/CreateOrderRequest.cs`, DTOs de requests en general
- **Problema**: los request DTOs no tienen `[Required]`/`[MaxLength]`; strings sin límite van directo a la DB (nombre de cliente de 1 MB, notas infinitas).
- **Solución**: anotar los DTOs de escritura: `CustomerName [MaxLength(100)]`, `Notes [MaxLength(500)]`, `Address [MaxLength(300)]`, `Quantity [Range(1,99)]`, etc. `ApiBehaviorOptions` ya formatea los errores (`Program.cs:68-78`).
- **Aceptación**: request con nombre de 5000 chars → 400 con mensaje de campo.

### S8 🟡 [S] Misceláneos de seguridad
- **CORS**: `Program.cs:45-51` — usar `Uri.TryCreate` (un header Origin malformado hoy lanza excepción) y permitir `localhost` solo en Development.
- **Security headers**: agregar middleware con `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- **JWT**: setear `ValidIssuer`/`ValidAudience` propios (`Program.cs:29-30`).
- **Upload**: `AdminController.cs:471-496` — validar magic bytes de la imagen, no solo ContentType/extensión.
- **Login multi-tenant**: `AuthController.cs:24-26` — el índice de email es único por `(TenantId, Email)` (`AppDbContext.cs:168`) pero el login busca solo por email → decidir semántica: email único global (cambiar índice, y ya coincide con el check de `SuperAdminController.cs:41`) es lo más simple.

---

## FASE 2 — Bugs de flujo (frontend tienda)

### F1 🔴 [S] Bloquear pedidos con el local cerrado
- **Archivos**: `front/src/components/store/CartModal.tsx:243, 482-503`, `back/MorfApp.Api/Controllers/StoreController.cs:247` (CreateOrder)
- **Problema**: `tenant.isOpen` solo se muestra como badge (`MenuHeader.tsx:43-45`). Se puede pedir a las 3 AM; el mensaje muere en WhatsApp.
- **Solución**: (1) en `CartModal`, si `!tenant.isOpen` deshabilitar Confirmar y mostrar "Cerrado ahora — abrimos {próximo horario}"; (2) en el backend, validar con `IsCurrentlyOpen()` (ya existe en `StoreController.cs:324`) y devolver 409 si está cerrado.
- **Aceptación**: test backend: pedido fuera de horario → 409. UI muestra el aviso.

### F2 🟠 [S] No quemar el cupo de promo si el pedido falla
- **Archivos**: `front/src/components/store/CartModal.tsx:249-288`, idealmente `StoreController.cs`
- **Problema**: la redemption se registra ANTES de guardar el pedido; si `createOrder` falla, el cliente perdió un uso de la promo. Además el check límite tiene race condition (check-then-insert, `StoreController.cs:163-185`).
- **Solución**: mover el registro de redemptions dentro de `CreateOrder` en el backend (transaccional, dentro del mismo `SaveChanges`). El front solo consulta `redemption-status` para mostrar el aviso antes de confirmar.
- **Aceptación**: si el pedido falla, `promo_redemptions` no tiene fila nueva.

### F3 🟠 [M] Conectar la página de éxito al flujo real
- **Archivos**: `front/src/components/store/CartModal.tsx:291-300`, `front/src/app/store/[tenant]/success/page.tsx`
- **Problema**: la página success existe pero nadie navega a ella; el flujo abre WhatsApp y cierra el modal sin confirmación en pantalla. Además usa una imagen hardcodeada de `googleusercontent.com` (línea 33) que puede morir.
- **Solución**: tras `createOrder`, `router.push` a `/success?orderId=...&total=...` (con el rewrite de subdominios queda `/{slug}/success`); ahí botón grande "Enviar pedido por WhatsApp" con el mensaje armado + resumen del pedido. Quitar la imagen externa (usar el banner del tenant o un fondo con CSS).
- **Aceptación**: e2e: confirmar pedido → aterriza en success con el orderId real → botón abre wa.me.

### F4 🟡 [S] Emitir `order_confirmed` por WebSocket
- **Archivos**: `back/MorfApp.Api/Controllers/OrdersController.cs:71-116` (comparar con `CancelOrder:136-140`)
- **Problema**: confirmar un pedido no emite evento WS; el front lo espera (`useWebSocket.ts:47`). Con dos dispositivos abiertos (mostrador + cocina), confirmar en uno no actualiza el otro.
- **Solución**: replicar el `BroadcastToTenantAsync` de CancelOrder con `Type = "order_confirmed"`.
- **Aceptación**: test que verifica el broadcast al confirmar.

### F5 🟡 [S] Arreglar cleanup de useWebSocket
- **Archivos**: `front/src/lib/useWebSocket.ts:59-81`
- **Problema**: la reconexión con `setTimeout(connect, 3000)` no se cancela al desmontar (loop eterno de reconexión tras salir del admin); el cleanup solo cierra si el estado es `OPEN` (una conexión en `CONNECTING` se filtra).
- **Solución**: guardar el timeout en un ref, flag `disposed` en el cleanup, cerrar también en `CONNECTING`.

### F6 🟡 [S] Redirect a login con ruta absoluta
- **Archivos**: `front/src/lib/admin-api.ts:96`
- **Problema**: `window.location.href = './login'` es relativo — desde una subruta profunda redirige mal.
- **Solución**: `'/admin/login'`.

---

## FASE 3 — Producto: cliente final (tienda)

### C1 🔴 [L] Tracking público del pedido
- **Archivos nuevos**: `front/src/app/store/[tenant]/order/[id]/page.tsx`, endpoint `GET /api/store/{slug}/orders/{id}` en `StoreController`
- **Qué**: página pública que muestra estado del pedido (pendiente/confirmado/cancelado + los estados nuevos de C2), items, total y tiempo estimado. Polling cada 30s (o refetch on focus). El link se incluye en el mensaje de WhatsApp y en la página success (F3).
- **Nota de seguridad**: el endpoint devuelve el pedido solo por su GUID (no enumerable); no exponer teléfono completo (enmascarar `**1234`).
- **Aceptación**: cliente crea pedido → abre el link → ve "Pendiente"; admin confirma → al refetch ve "Confirmado".

### C2 🟠 [M] Estados de pedido ricos
- **Archivos**: `back/MorfApp.Domain/Enums/OrderStatus.cs`, `OrdersController.cs`, `front/src/app/admin/orders/page.tsx`, migración EF
- **Qué**: agregar `Preparing`, `Ready` (listo para retirar / en camino), `Delivered`. Transiciones: Pending → Confirmed → Preparing → Ready → Delivered; Cancelled desde Pending/Confirmed. Botones de avance en la tabla de pedidos del admin + broadcast WS por cada cambio.
- **Aceptación**: flujo completo avanza estado por estado; el tracking C1 los refleja.

### C3 🟠 [S] Recordar datos del cliente
- **Archivos**: `front/src/components/store/CartModal.tsx:193-200`
- **Qué**: al confirmar un pedido, guardar `{name, phone, address}` en localStorage (`morf_customer`); al abrir el checkout, prefillar. Botón "×" para limpiar.
- **Aceptación**: segundo pedido arranca con los datos cargados.

### C4 🟡 [S] Buscador en el menú
- **Archivos**: `front/src/components/store/StoreShell.tsx` / `MenuHeader.tsx`
- **Qué**: input de búsqueda que filtra client-side productos por nombre/descripción sobre las categorías ya cargadas. Mostrar "Sin resultados para «x»" como empty state.

### C5 🟡 [S] Página success sin imagen externa + PWA básica
- **Archivos**: `front/src/app/store/[tenant]/success/page.tsx:33`, `front/src/app/manifest.ts` (nuevo), `front/public/`
- **Qué**: quitar la URL de googleusercontent; agregar `manifest.ts` de Next (nombre, colores, íconos) para que la tienda y el admin sean instalables en el home screen. Limpiar los SVGs default de Next en `front/public/` (`vercel.svg`, `next.svg`, etc.).

### C6 🟢 [L] Cupones de descuento por código *(fase posterior)*
- **Qué**: entidad `Coupon` (código, % o monto fijo, vencimiento, usos máximos, por tenant), campo en checkout, validación server-side dentro de CreateOrder (depende de S1). CRUD en admin.

### C7 🟢 [L] Mercado Pago *(estratégico, después de todo lo demás)*
- **Qué**: preferencia de pago MP al crear el pedido cuando `paymentMethod = 'mp'`; webhook de confirmación de pago; credenciales MP por tenant (plan Negocio como diferenciador). Definir bien antes de implementar.

---

## FASE 4 — Producto: admin del tenant

### A1 🔴 [M] Sonido + notificación de navegador al llegar pedido
- **Archivos**: `front/src/lib/useWebSocket.ts`, `front/public/` (agregar `new-order.mp3`), `front/src/app/admin/orders/page.tsx`
- **Qué**: al recibir `new_order`: reproducir sonido + `Notification` del browser ("Nuevo pedido de {nombre} — ${total}") si hay permiso (pedirlo con un botón "Activar notificaciones" en la pantalla de pedidos, no automáticamente). Toggle de sonido on/off persistido en localStorage.
- **Aceptación**: con la pestaña en segundo plano llega notificación; con la pestaña activa suena.

### A2 🟠 [S] Botón "Pausar tienda ahora"
- **Archivos**: `back/MorfApp.Domain/Entities/Tenant.cs` (+migración: `IsPaused bool`), `AdminController.cs` (PUT), `StoreController.cs` (IsCurrentlyOpen → false si IsPaused), `front/src/app/admin/layout.tsx` (switch en header)
- **Qué**: toggle inmediato "cerrado temporalmente" independiente de los horarios. La tienda muestra "Cerrado temporalmente" y bloquea pedidos (usa F1).

### A3 🟠 [S] Cambio de contraseña del admin logueado
- **Archivos**: `back/MorfApp.Api/Controllers/AuthController.cs` (nuevo `POST /api/auth/change-password` con `[Authorize]`), `front/src/app/admin/config/page.tsx` (sección Cuenta)
- **Problema**: hoy no existe — un admin no puede cambiar su propia contraseña.
- **Qué**: pide contraseña actual + nueva (mín. 8 chars); verifica BCrypt, actualiza hash, revoca todos los refresh tokens del usuario.

### A4 🟠 [M] Recuperación de contraseña ("olvidé mi contraseña")
- **Archivos**: `AuthController.cs` (`POST /api/auth/forgot-password` — reusa `SetupTokens` + `EmailService`), `front/src/app/admin/login/page.tsx` (link), página `/admin/reset-password` (reusa el flujo de setup-password)
- **Qué**: input de email → si existe, manda mail con link (respuesta siempre 200 para no revelar si el email existe). Rate limited (S3).

### A5 🟡 [S] Impresión de comanda
- **Archivos**: `front/src/app/admin/orders/page.tsx`
- **Qué**: botón 🖨 por pedido que abre vista print-friendly (media query `@media print` o ventana nueva) con items, modifiers, observaciones, datos del cliente y modo de entrega. `window.print()`.

### A6 🟡 [S] Producto "agotado hoy"
- **Archivos**: `Product.cs` (+migración: `IsOutOfStock bool`), `AdminController.cs`, `StoreController.GetMenu`, `front` (menú admin: toggle; tienda: producto visible pero deshabilitado con badge "Sin stock")
- **Qué**: distinto de `IsActive` (que oculta). El producto agotado se ve tachado y no se puede agregar al carrito.

### A7 🟡 [S] Export CSV de pedidos y métricas
- **Archivos**: `OrdersController.cs` / `MetricsController.cs` (endpoint `?format=csv` o endpoint `/export`), botón "Exportar" en las dos pantallas
- **Qué**: CSV con separador `;` (Excel es-AR), encoding UTF-8 BOM, rango de fechas.

### A8 🟢 [M] Onboarding del tenant nuevo
- **Archivos**: `front/src/app/admin/page.tsx` o banner en layout
- **Qué**: checklist visible hasta completarse: "① Cargá tu primera categoría y producto ② Configurá horarios ③ Configurá tu número de WhatsApp ④ Personalizá tu marca ⑤ Compartí tu link". Detectable con los datos que ya devuelve `/api/admin/me` + categories.

### A9 🟢 [L] Multi-usuario por tenant *(posponer)*
- Roles dueño/empleado, invitaciones por email. Recién cuando haya tenants grandes.

---

## FASE 5 — Producto: superadmin

### P1 🟠 [M] Dashboard con métricas del negocio
- **Archivos**: `superadmin/src/app/page.tsx` (hoy es un redirect de 5 líneas), nuevo endpoint `GET /api/superadmin/dashboard`
- **Qué**: tenants activos/pendientes/vencidos, pedidos totales últimos 7/30 días por tenant, tenants sin pedidos en 14 días (alerta de churn), próximos vencimientos de suscripción.

### P2 🟠 [M] Ciclo de suscripción automatizado
- **Archivos**: `back/MorfApp.Api/` (BackgroundService diario), `front/src/app/admin/layout.tsx` (banner)
- **Qué**: job diario que (1) marca `Inactive` a tenants con `SubscriptionEndsAt` vencida hace >N días de gracia, (2) expone en `/api/admin/me` los días restantes para que el admin del tenant vea banner "Tu plan vence en X días". La tienda de un tenant `Inactive` ya devuelve 403 (`StoreController.cs:83`) — verificar que el front lo muestre bien (`StorePaginaNoDisponible`).

### P3 🟡 [S] Impersonation ("entrar como tenant")
- **Archivos**: `SuperAdminController.cs` (nuevo `POST /tenants/{id}/impersonate` → JWT corto de 15 min con `tenant_id` del tenant + claim `impersonated: true`), botón en la lista de tenants que abre `/admin` con ese token
- **Qué**: soporte sin pedir contraseñas. Loguear cada impersonation.

### P4 🟡 [S] Unificar toasts del superadmin con sonner
- **Archivos**: `superadmin/src/app/tenants/page.tsx:57-60` (toast casero con setTimeout), resto de páginas
- **Qué**: agregar `sonner` a `superadmin/package.json` y usar el mismo patrón que el admin.

### P5 🟢 [S] Aprovechar page_views (analytics de visitas)
- **Archivos**: la tabla `page_views` + índice ya existen (`AppDbContext.cs:191`) pero **nada la escribe ni la lee**
- **Qué**: endpoint público `POST /api/store/{slug}/track` (evento `visit`, rate limited, sin PII), beacon desde la tienda, y en métricas del admin: visitas + tasa de conversión (pedidos/visitas). Si se decide no hacerlo, borrar la entidad.

---

## FASE 6 — Deuda técnica y calidad

### T1 🟠 [M] Eliminar el bloque SQL de reparación de migraciones del startup
- **Archivos**: `back/MorfApp.Api/Program.cs:94-177`
- **Qué**: 80 líneas de SQL crudo con migraciones hardcodeadas que corren en cada arranque. Verificar que PRE y PROD tienen el historial consistente, borrar el bloque, y mover `MigrateAsync()` a un paso del pipeline (o dejarlo solo si `Environment.IsDevelopment()`).

### T2 🟡 [M] Arreglar N+1 en ConfirmOrder
- **Archivos**: `back/MorfApp.Api/Controllers/OrdersController.cs:87-111`
- **Qué**: hoy hace 1 query por item + 1 por supply. Cargar todos los `ProductSupplies` de los productos del pedido en una query y los `Supplies` en otra (dictionary por Id).

### T3 🟡 [S] Cache SSR del storefront
- **Archivos**: `front/src/lib/api.ts:52, 62, 71`
- **Qué**: cambiar `cache: 'no-store'` por `next: { revalidate: 60 }` en `getTenant`, `getMenu`, `getPromotions` (createOrder y redemptions siguen no-store). Alinear con lo que dice CLAUDE.md.

### T4 🟡 [S] GetPromotions no debe cargar todo el catálogo
- **Archivos**: `StoreController.cs:128-132`, `AdminController.cs:551-553`
- **Qué**: filtrar productos por los `ProductIds` de las promos en vez de traer todos los del tenant con modifiers.

### T5 🟡 [M] Migrar páginas admin a TanStack Query
- **Archivos**: `front/src/app/admin/menu/page.tsx`, `promotions`, `proveedores`, `insumos`, `branding`, `config`, `whatsapp`, `modifiers`
- **Qué**: solo orders y metrics usan TanStack Query; el resto hace useState+useEffect manual. Migrar de a una página por PR a `useQuery`/`useMutation` con invalidación. Empezar por `menu`.

### T6 🟡 [S] Deduplicar el nav del admin layout
- **Archivos**: `front/src/app/admin/layout.tsx:81-233`
- **Qué**: sidebar desktop y drawer mobile son el mismo JSX copiado (~150 líneas). Extraer `<NavContent onNavigate? />`.

### T7 🟡 [M] Pasada de accesibilidad
- **Archivos**: todo `front/src` (hoy hay 3 atributos aria en total)
- **Qué**: `aria-label` en todos los botones icon-only (hamburguesa `layout.tsx:245`, +/−/🗑 del carrito `CartModal.tsx:95-116`), `role="dialog" aria-modal="true"` + focus trap + Escape en modales (CartModal, confirmaciones de menu/promotions), `alt` significativos en imágenes.

### T8 🟢 [S] Limpiezas menores
- Borrar `front/src/app/store/[tenant]/admin/` completo (admin viejo sin uso — trampa documentada).
- Borrar `getAdminProducts()` (`admin-api.ts:220-223` — llama a un GET que no existe).
- Agregar `CancellationToken ct` a los endpoints y pasarlo a los `*Async` de EF.
- Quitar los `console.log` de producción (16 en front, sobre todo `useWebSocket.ts`).
- Unificar theming de `orders/page.tsx` (hex hardcodeados → CSS vars).
- `<img>` → `next/image` en `menu/page.tsx`.
- Borrar archivos basura en `back/`: `17.9.1)`, `32`, `p.TenantId`, y los `publish*/` viejos.
- Actualizar `CLAUDE.md`: IsCurrentlyOpen ya usa timezone (no es TODO), el carrito SÍ se persiste (zustand persist), el store usa revalidate tras T3.
- Alinear versiones NuGet (`Microsoft.AspNetCore.OpenApi` 9.0.13 vs resto 9.0.4) y actualizar patches EF.

---

## Orden de ejecución sugerido

| Sprint | Ítems | Resultado |
|---|---|---|
| 1 | S1, S2, S4, F1, F4 | Sin agujeros de seguridad graves; pedidos consistentes |
| 2 | A1, F2, F3, C3, S6 | La experiencia de pedido se siente completa; CI confiable |
| 3 | C2 + C1, A2, A3 | Tracking de pedidos punta a punta |
| 4 | A4, P1, P2, S3, S5 | Soporte y ciclo de suscripción cerrados |
| 5 | T1–T8, A5, A6, A7, P3, P4 | Deuda técnica y calidad de vida |
| Después | C6, C7, A8, A9, P5 | Cupones, Mercado Pago, onboarding, multi-usuario |
