# Handoff: auditoria de front, responsive y bugs visibles

Fecha de auditoria: 2026-05-07

Alcance probado:
- `front` con API local en `http://localhost:5500`.
- Login admin seed: `admin@dev.morfapp.app` / `Admin123!`.
- Rutas probadas en desktop `1366x900` y mobile `390x844`.
- Rutas: `/store/dev`, `/admin/menu`, `/admin/modifiers`, `/admin/promotions`, `/admin/orders`, `/admin/metrics`, `/admin/proveedores`, `/admin/insumos`, `/admin/branding`, `/admin/whatsapp`, `/admin/config`.
- `landing` con build, test y lint.

Comandos ejecutados:
- `front`: `npm.cmd run build` pasa.
- `front`: `npm.cmd run lint` falla con 26 errores y 35 warnings.
- `landing`: `npm.cmd run build` pasa.
- `landing`: `npm.cmd run test` pasa.
- `landing`: `npm.cmd run lint` falla porque el script usa `next lint`.

## P0/P1 - Corregir lint de `front`

Estado actual:
- `npm.cmd run lint` falla en `front`.
- El build productivo pasa, pero el lint no es confiable para CI ni calidad.

Errores representativos:
- `react-hooks/set-state-in-effect` en layouts y paginas admin.
- `react-hooks/immutability` por funciones accedidas antes de declararse.
- `react-hooks/error-boundaries` en `/store/[tenant]/page.tsx`.
- `@typescript-eslint/no-explicit-any` en promociones, promo modal y websocket.
- `react/no-unescaped-entities` en proveedores y superadmin tenants.
- Warnings de variables/funciones no usadas.

Archivos afectados principales:
- `front/src/app/admin/layout.tsx`
- `front/src/app/store/[tenant]/admin/layout.tsx`
- `front/src/app/superadmin/layout.tsx`
- `front/src/app/admin/menu/page.tsx`
- `front/src/app/admin/modifiers/page.tsx`
- `front/src/app/admin/promotions/page.tsx`
- `front/src/app/admin/proveedores/page.tsx`
- `front/src/app/store/[tenant]/page.tsx`
- `front/src/app/superadmin/settings/page.tsx`
- `front/src/app/superadmin/tenants/page.tsx`
- `front/src/components/store/PromoModal.tsx`
- `front/src/lib/useWebSocket.ts`

Criterio de aceptacion:
- `cd front && npm.cmd run lint` termina con exit code `0`.
- `cd front && npm.cmd run build` sigue pasando.
- No se silencian reglas globalmente para ocultar problemas reales.

## P1 - Overflow horizontal en mobile admin

Sintoma:
- En mobile `390x844`, todas las rutas `/admin/*` auditadas tienen overflow horizontal aproximado de `54px`.
- El viewport se puede desplazar horizontalmente.

Causa detectada:
- En `front/src/app/admin/layout.tsx`, el boton de notificaciones mobile renderiza `<span className="mat">notifications</span>`.
- Si Material Symbols no carga, el texto `notifications` queda visible con ancho ~110px y sobresale del viewport.
- El boton tampoco tiene `onClick`, `aria-label` ni funcionalidad aparente.

Archivo:
- `front/src/app/admin/layout.tsx`, bloque mobile topbar, boton de notificaciones.

Reproduccion:
1. Levantar API y front.
2. Loguearse como admin.
3. Abrir `/admin/config` en `390x844`.
4. Ejecutar en consola: `document.documentElement.scrollWidth - window.innerWidth`.
5. Resultado actual: ~54.

Opciones de fix:
- Remover el boton si no hay pantalla/feature de notificaciones.
- O convertirlo en funcional y accesible, usando un icono robusto que no dependa de texto visible cuando falla la fuente.
- Agregar `aria-label="Notificaciones"` si se mantiene.

Criterio de aceptacion:
- En `390x844`, `document.documentElement.scrollWidth <= window.innerWidth` en todas las rutas admin.
- No aparece el texto literal `notifications` si falla Google Fonts/Material Symbols.
- Si el boton queda visible, tiene comportamiento definido o se elimina.

## P1 - Promo seed rota en tienda `/store/dev`

Sintoma visible:
- En `/store/dev` aparece una promo `Combo Clasico` con:
  - emoji `??`
  - descuento `-0%`
  - precio `$0`
  - precio original `$0`
  - productos vacios

Respuesta actual de API:
```json
[
  {
    "id": "4e9e9b64-7e85-4e3c-b7f8-0ad0f3d2d151",
    "name": "Combo Clasico",
    "description": "Clasica + gaseosa con precio promo",
    "price": 0.00,
    "emoji": "??",
    "originalPrice": 0,
    "discountPercent": 0,
    "products": [],
    "modifierGroups": []
  }
]
```

Archivos a investigar:
- `back/MorfApp.Api/DevelopmentSeeder.cs`
- `back/MorfApp.Api/Controllers/StoreController.cs`
- `back/MorfApp.Api/Controllers/AdminController.cs`
- `front/src/components/store/PromoCard.tsx`
- `front/src/components/store/PromoModal.tsx`

Hipotesis:
- La promo existente en DB quedo con `ProductIds` invalidos/vacios o no esta siendo re-sembrada correctamente.
- El seeder actual no corrige promociones existentes.
- El frontend no oculta promos invalidas y muestra valores `0`.

Criterio de aceptacion:
- `/api/store/dev/promotions` devuelve una promo valida con productos incluidos, precio original > 0, precio final > 0 y descuento > 0.
- `/store/dev` no muestra `??`, `-0%` ni `$0` para promociones publicas.
- Si una promo queda inconsistente en DB, la API no deberia exponerla como promo comprable o el admin deberia marcarla como incompleta.

## P1 - Mojibake en textos visibles

Sintoma:
- Hay textos con encoding roto en el codigo/UI, por ejemplo:
  - `ConfiguraciÃ³n`
  - `envÃ­o`
  - `CÃ³digo`
  - `DirecciÃ³n`
  - `MÃ¡x`
  - varios emojis renderizados como `ðŸ...`

Archivos donde se vio:
- `front/src/app/admin/config/page.tsx`
- `front/src/components/store/PromoCard.tsx`
- `front/src/app/admin/layout.tsx`
- `front/src/app/admin/login/page.tsx`
- `back/MorfApp.Api/DevelopmentSeeder.cs`

Notas:
- Algunas respuestas de API ya devuelven Unicode correcto, por ejemplo `/api/store/dev/menu`.
- El problema parece estar en archivos fuente guardados o pegados con encoding incorrecto, no necesariamente en toda la cadena.

Criterio de aceptacion:
- Buscar en `front/src` y `back` patrones `Ã`, `Â`, `ðŸ`, `â` y corregirlos cuando representen texto roto.
- Verificar visualmente login, admin config, nav admin, promo cards y tienda.
- Mantener archivos en UTF-8.

## P1/P2 - Hydration mismatch en `/store/dev`

Sintoma:
- Consola de Chromium reporta hydration mismatch al entrar a `/store/dev`.

Mensaje relevante:
- React informa que atributos del HTML renderizado por servidor no coinciden con cliente.
- El diff apunta al `<html>` con variables CSS de tema aplicadas por script.

Archivo:
- `front/src/app/store/[tenant]/layout.tsx`

Causa probable:
- El layout inyecta un `<script>` que muta `document.documentElement.style` con `--color-primary`, `--color-accent`, etc.
- Esa mutacion ocurre sobre `<html>` y React detecta mismatch contra el SSR.

Criterio de aceptacion:
- Entrar a `/store/dev` en dev no emite hydration mismatch.
- El theme por tenant sigue funcionando.
- Preferir que las variables CSS se rendericen de forma consistente en SSR, no como mutacion tardia de `<html>`.

## P2 - Configuracion de medios de pago no visible/usada

Sintoma:
- En `front/src/app/admin/config/page.tsx` existen:
  - `savePayment`
  - `togglePayment`
  - `paymentSaving`
  - `paymentSaved`
- Pero no hay UI visible que use esas funciones/estados.

Riesgo:
- El admin no puede editar medios de pago aunque el estado y API parezcan preparados.
- Tambien genera warnings de lint por codigo muerto.

Criterio de aceptacion:
- Si la feature corresponde, agregar seccion de medios de pago en Configuracion y conectar `togglePayment`/`savePayment`.
- Si no corresponde, remover codigo muerto.
- `npm.cmd run lint` no debe reportar estas variables como no usadas.

## P2 - Botones potencialmente inutiles o no accesibles

Hallazgo confirmado:
- Boton de notificaciones mobile en `front/src/app/admin/layout.tsx` no tiene handler ni label accesible.

Otros botones a revisar:
- Botones icon-only de cerrar modales, editar, eliminar y toggles en admin.
- Muchos tienen solo icono/texto Material Symbols; si falla la fuente pueden degradar a texto tecnico.

Criterio de aceptacion:
- Botones icon-only tienen `aria-label` descriptivo.
- Botones visibles tienen accion real o se eliminan.
- No se renderizan botones decorativos como interactivos.

## P2 - Lint roto en `landing`

Sintoma:
- `cd landing && npm.cmd run lint` falla con:
  - `Invalid project directory provided, no such directory: ...\landing\lint`

Causa:
- `package.json` usa `"lint": "next lint"`.
- En Next 16, `next lint` ya no funciona como antes; interpreta `lint` como directorio.

Archivo:
- `landing/package.json`

Criterio de aceptacion:
- Actualizar script de lint a una alternativa compatible, por ejemplo `eslint` si la config existe o agregar config minima.
- `cd landing && npm.cmd run lint` termina con exit code `0`.
- `cd landing && npm.cmd run build` sigue pasando.

## Verificacion final esperada

Cuando se implementen fixes, correr:
- `cd front && npm.cmd run lint`
- `cd front && npm.cmd run build`
- `cd landing && npm.cmd run lint`
- `cd landing && npm.cmd run build`
- `cd landing && npm.cmd run test`

Validacion manual/browser:
- `/store/dev` desktop y mobile.
- `/admin/login` mobile.
- `/admin/menu`, `/admin/config`, `/admin/promotions`, `/admin/orders` mobile `390x844`.
- Confirmar sin overflow horizontal: `document.documentElement.scrollWidth - window.innerWidth` debe ser `0` o menor/igual a `0`.
- Confirmar consola sin hydration mismatch y sin errores no esperados.
