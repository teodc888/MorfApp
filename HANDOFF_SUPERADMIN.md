# Handoff — Panel SuperAdmin

**Fecha:** 2026-05-03  
**Branch:** `feature/contact-chatbot-hybrid`  
**Estado:** Implementado, pendiente de migración en servidor y despliegue

---

## Resumen de cambios

Se implementó un panel de SuperAdmin completo que permite gestionar todos los negocios (tenants) registrados en MorfApp desde una interfaz centralizada, accesible solo para el usuario superadmin.

---

## Archivos modificados / creados

### Backend

| Archivo | Tipo | Descripción |
|---|---|---|
| `back/MorfApp.Domain/Entities/Tenant.cs` | Modificado | Se agregaron propiedades `Plan` (enum), `OwnerName` (string), `OwnerPhone` (string) |
| `back/MorfApp.Domain/Enums/TenantPlan.cs` | **Nuevo** | Enum con valores `Basico`, `Pro`, `Negocio` |
| `back/MorfApp.Application/DTOs/SuperAdmin/SuperAdminTenantDto.cs` | **Nuevo** | DTO de respuesta con id, slug, name, ownerName, ownerPhone, plan, status, subscriptionEndsAt, createdAt, adminCount |
| `back/MorfApp.Application/DTOs/SuperAdmin/CreateTenantRequest.cs` | **Nuevo** | Request para crear tenant (name, slug, plan, ownerName, ownerPhone, subscriptionEndsAt, adminEmail, adminPassword) |
| `back/MorfApp.Application/DTOs/SuperAdmin/UpdateTenantSuperAdminRequest.cs` | **Nuevo** | Request parcial para editar tenant |
| `back/MorfApp.Application/DTOs/Admin/UpdatePlanRequest.cs` | **Nuevo** | DTO auxiliar para cambio de plan |
| `back/MorfApp.Api/Controllers/SuperAdminController.cs` | **Nuevo** | Controller con 4 endpoints (ver más abajo) |
| `back/MorfApp.Api/SuperAdminSeeder.cs` | **Nuevo** | Seed inicial del usuario superadmin (corre al arrancar la API) |
| `back/MorfApp.Api/Program.cs` | Modificado | Se llama `SuperAdminSeeder.SeedAsync()` durante el startup |
| `back/MorfApp.Infrastructure/Migrations/20260503192336_AddTenantOwnerAndPlan.cs` | **Nuevo** | Migración que agrega columnas `owner_name`, `owner_phone`, `plan` a tabla `tenants` |
| `back/MorfApp.Infrastructure/Persistence/AppDbContext.cs` | Modificado | Se mapean las nuevas columnas del Tenant |

### Frontend

| Archivo | Tipo | Descripción |
|---|---|---|
| `front/src/app/superadmin/layout.tsx` | **Nuevo** | Layout con sidebar, guard de autenticación (requiere `is_superadmin`) |
| `front/src/app/superadmin/page.tsx` | **Nuevo** | Redirect automático a `/superadmin/tenants` |
| `front/src/app/superadmin/tenants/page.tsx` | **Nuevo** | Listado de todos los negocios con acciones |
| `front/src/app/superadmin/tenants/new/page.tsx` | **Nuevo** | Formulario para crear un nuevo negocio |
| `front/src/lib/superadmin-api.ts` | **Nuevo** | Cliente API para todos los endpoints del superadmin |
| `front/src/lib/auth.ts` | Modificado | Se agregó función `isSuperadmin()` que lee el claim `is_superadmin` del JWT |
| `front/src/app/admin/login/page.tsx` | Modificado | Al hacer login con superadmin, redirige a `/superadmin` en lugar de `/admin` |

---

## API — Endpoints SuperAdmin

Base URL: `/api/superadmin`  
Todos requieren JWT con `is_superadmin = true`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/superadmin/tenants` | Lista todos los tenants con datos del dueño y conteo de admins |
| `POST` | `/api/superadmin/tenants` | Crea un tenant + usuario admin inicial en una sola operación |
| `PUT` | `/api/superadmin/tenants/{id}` | Edita nombre, dueño, teléfono, fecha de vencimiento |
| `PUT` | `/api/superadmin/tenants/{id}/status` | Cambia estado entre `Active` / `Inactive` |

---

## Usuario SuperAdmin (credenciales semilla)

| Campo | Valor |
|---|---|
| Email | `super@morfapp.app` |
| Contraseña | `BenjaminyPupi4$` |
| `IsSuperadmin` | `true` |
| `TenantId` | `null` (no pertenece a ningún tenant) |

El seeder corre automáticamente al iniciar la API. Si el usuario ya existe, no hace nada.

---

## Qué se ve al entrar al panel SuperAdmin

**URL de acceso:**
- PRE: `https://pre.morfapp.app/superadmin` (o `https://super.pre.morfapp.app`)
- PROD: `https://morfapp.app/superadmin` (o `https://super.morfapp.app`)

**Flujo:**
1. Ingresar a `/admin/login` con las credenciales superadmin
2. Al autenticarse, el claim `is_superadmin = true` redirige automáticamente a `/superadmin`
3. Si se intenta acceder a `/superadmin` sin ese claim, redirige a `/admin/login`

**Pantalla principal — Lista de Negocios (`/superadmin/tenants`):**

```
┌────────────────────────────────────────────────────────────┐
│  MorfApp super                                             │
│  ─────────────                                             │
│  🏪 Negocios   ← única sección del sidebar                │
└────────────────────────────────────────────────────────────┘

Negocios                              [+ Nuevo negocio]
3 negocios registrados

┌──────────┬──────────────┬─────────┬──────────────┬─────────┬──────────────────────────┐
│ Negocio  │ Dueño        │ Plan    │ Vencimiento  │ Estado  │ Acciones                 │
├──────────┼──────────────┼─────────┼──────────────┼─────────┼──────────────────────────┤
│ Burger   │ Juan Pérez   │ Pro     │ 15 jun. 2026 │ Activo  │ 💬 Notificar  Editar  Dar baja │
│ co       │ 5493516...   │         │              │         │                          │
├──────────┼──────────────┼─────────┼──────────────┼─────────┼──────────────────────────┤
│ La Pizza │ Ana García   │ Básico  │ 1 may. 2026  │ Inactivo│ 💬 Notificar  Editar  Dar alta  │
│          │              │         │ (Venció hace │  (rojo) │                          │
│          │              │         │  2 días)     │         │                          │
└──────────┴──────────────┴─────────┴──────────────┴─────────┴──────────────────────────┘
```

**Indicadores visuales:**
- Plan **Básico**: badge gris
- Plan **Pro**: badge azul  
- Plan **Negocio**: badge púrpura
- **Activo**: badge verde
- **Inactivo**: badge rojo
- Suscripción **vence en ≤7 días**: fecha en naranja + "Vence en X días"
- Suscripción **ya vencida**: fecha en rojo + "Venció hace X días"

**Acciones por negocio:**
- **💬 Notificar** (aparece solo si tiene teléfono): abre WhatsApp con mensaje pre-armado de renovación  
- **Editar**: navega a `/superadmin/tenants/{id}/edit` _(ruta existe en frontend, página pendiente de crear)_
- **Dar baja / Dar alta**: toggle de estado `Active` ↔ `Inactive`, sin confirmación, instantáneo

**Formulario Nuevo Negocio (`/superadmin/tenants/new`):**

Campos agrupados en 4 secciones:
1. **Negocio**: Nombre + Slug (se auto-genera desde el nombre, editable)
2. **Plan y suscripción**: Selector de plan (Básico / Pro / Negocio) + Fecha de vencimiento
3. **Datos del dueño**: Nombre del dueño + Teléfono WhatsApp (formato: `5493516133893`)
4. **Acceso admin**: Email + Contraseña inicial (mínimo 8 caracteres)

Al guardar: crea el tenant + el usuario admin en una sola llamada a la API.

---

## Qué falta implementar

| Pendiente | Prioridad |
|---|---|
| Página `/superadmin/tenants/{id}/edit` (formulario de edición) | Alta — el botón "Editar" ya existe y apunta a esa ruta |
| Confirmación antes de "Dar baja" (actualmente sin diálogo) | Media |
| Migración ejecutada en servidor PRE/PROD | **Crítico** — sin esto la API falla al arrancar |
| Despliegue a PRE | Necesario para poder probar |

---

## Pasos para activar en servidor

### 1. Aplicar migración

```bash
cd back
dotnet ef database update --project MorfApp.Infrastructure --startup-project MorfApp.Api
```

O en PRE/PROD: la migración se aplica automáticamente al iniciar la API (el `Program.cs` llama `db.Database.MigrateAsync()`).

### 2. Desplegar backend

```bash
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/
scp -r publish-pre/* teo@100.95.233.68:/home/teo/morfapp-pre-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"
```

### 3. Desplegar frontend

```bash
cd front
rm -rf .next
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-frontend.tar.gz .next public
scp /tmp/morfapp-pre-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-web && tar -xzf /tmp/morfapp-pre-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"
```

### 4. Verificar

```bash
# Login como superadmin
curl -X POST https://api-pre.morfapp.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@morfapp.app","password":"BenjaminyPupi4$"}'
# Debe retornar accessToken con is_superadmin = true

# Abrir en browser
# https://pre.morfapp.app/admin/login → login → redirige a /superadmin/tenants
```

---

## Notas técnicas

- El superadmin tiene `TenantId = null` en la DB — el `AuthController` ya maneja esto (no requiere tenant para emitir el token).
- La seguridad en el backend es doble: JWT `[Authorize]` en el controller + verificación explícita `IsSuperAdmin` en cada endpoint (retorna `403 Forbidden` si el claim no está presente).
- El frontend redirige a `/admin/login` si `isSuperadmin()` retorna `false` — funciona leyendo el claim del JWT en `localStorage` sin llamada extra a la API.
- La página `edit` apunta a `/superadmin/tenants/${tenant.id}/edit` — esa ruta aún no tiene página creada en el App Router.
