# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: Always speak in Spanish with this user. Use clear, concise Spanish in all responses.

## Commands

### Frontend (`front/`)

```bash
cd front
npm run dev        # dev server on :3000
npm run build      # production build (standalone output)
npm run lint       # eslint
```

### Backend (`back/`)

```bash
cd back
dotnet build
dotnet run --project MorfApp.Api   # API on :5500 (dev)

# EF Core migrations (run from back/)
dotnet ef migrations add <MigrationName> --project MorfApp.Infrastructure --startup-project MorfApp.Api
dotnet ef database update --project MorfApp.Infrastructure --startup-project MorfApp.Api
```

### Environment variables

Frontend (`.env.local` inside `front/`):
- `NEXT_PUBLIC_API_URL` — public API base URL (browser). **CRITICAL for deployment**: must be set during build (`NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app npm run build`)
- `NEXT_INTERNAL_API_URL` — internal API base URL (SSR, avoids network round-trip)
- `NEXT_PUBLIC_ROOT_DOMAIN` — e.g. `morfapp.app` (changed from `amadeo.teodc.com`)
- **Local dev tip**: Set these in `.env.local` file or pass them as env vars during build

Backend (`appsettings.json` / env overrides):
- `ConnectionStrings:DefaultConnection` — PostgreSQL connection string
- `Jwt:Secret` — must be ≥32 chars in production
- `App:RootDomain` — used for wildcard CORS
- `App:UploadsPath` — filesystem path for uploaded images (defaults to `<contentRoot>/uploads`)
- `App:PublicUrl` — public base URL for building upload URLs returned to clients (defaults to `http://localhost:5500`)

## Architecture

### Multi-tenant subdomain model

Each tenant gets a slug (e.g. `burger`). The frontend middleware (`front/src/proxy.ts`) intercepts the hostname and rewrites paths:

| Incoming host | Rewritten path |
|---|---|
| `burger.amadeo.teodc.com` | `/store/burger/...` |
| `admin.amadeo.teodc.com` | `/admin/...` |
| `super.amadeo.teodc.com` | `/superadmin/...` |
| `localhost` | no rewrite (dev fallback) |

The proxy rewrites subdomains to App Router paths. **Admin access is always via `/admin/` route** (not a subdomain — `/admin/` exists as top-level App Router path). **All tenant data is isolated by `TenantId` extracted from the JWT claim `tenant_id`.**

### Frontend (`front/src/`)

- `proxy.ts` — Next.js middleware that rewrites subdomain requests to app routes:
  - `admin.morfapp.app` → `/admin/...`
  - `[tenant].morfapp.app` → `/store/[tenant]/...`
  - `super.morfapp.app` → `/superadmin/...`
  - `localhost` (dev) → no rewrite, runs demo
- `app/admin/` — **MAIN admin panel** (sections: branding, config, menu, modifiers, promotions, whatsapp)
  - Accessed via `/admin/` route: `https://pre.morfapp.app/admin` (PRE) or `https://morfapp.app/admin` (PROD)
  - Client-side, JWT-gated
  - Routes: `login`, `branding`, `config`, `menu`, `modifiers`, `promotions`, `whatsapp`
- `app/store/[tenant]/` — public storefront (SSR, `next: { revalidate: 60 }`)
- `lib/api.ts` — SSR-safe fetch helpers for the store (uses `NEXT_INTERNAL_API_URL` on server)
- `lib/admin-api.ts` — authenticated fetch wrapper with automatic token refresh and retry queue
- `lib/auth.ts` — JWT storage in `localStorage` (access + refresh token)
- `store/cart.ts` — Zustand store for cart state (in-memory, not persisted)
- `types/store.ts` — shared TypeScript types for the full domain model

**State management**: TanStack Query handles server state for admin; `useCartStore` (Zustand) handles cart client state.

**IMPORTANT**: Only work in `app/admin/` directory. The `app/store/[tenant]/admin/` directory exists but is NOT used.

### Backend (`back/`)

Clean Architecture, four projects:

| Project | Role |
|---|---|
| `MorfApp.Domain` | Entities, enums — no dependencies |
| `MorfApp.Application` | DTOs, `IAppDbContext` interface |
| `MorfApp.Infrastructure` | `AppDbContext` (EF Core), migrations |
| `MorfApp.Api` | Controllers, DI wiring, `Program.cs` |

Controllers inject `IAppDbContext` directly — there is no service/repository layer between controllers and the DB context. Mapping from entities to DTOs is done in static mapper methods inside each controller.

**File uploads**: `POST /api/admin/upload` accepts multipart form data (JPG/PNG/WebP/GIF, max 5 MB). Files are written to `App:UploadsPath` and served as static files at `/uploads/<filename>`. The response returns `{ url }` using `App:PublicUrl` as the base.

**Auth flow**: `POST /api/auth/login` → returns `{ accessToken, refreshToken, expiresIn }`. Access token is a 15-min JWT with claims `sub`, `email`, `is_superadmin`, `tenant_id`, `tenant_slug`. Refresh tokens are stored in `refresh_tokens` table and rotated on each use (`IsRevoked = true` on the old token before issuing a new one). The frontend `adminFetch()` in `admin-api.ts` handles 401 responses by queuing concurrent requests and retrying after a single refresh attempt.

**Tenant isolation**: `AdminController` extracts `tenant_id` from the JWT claim on every request. All queries filter by this ID — there is no middleware enforcing it globally, so **every new admin endpoint must explicitly filter by `TenantId`**.

### Admin panel features (`app/admin/`)

- **Login** (`/admin/login`) — JWT authentication, access + refresh tokens
- **Menu** (`/admin/menu`) — Manage categories and products
  - Add/edit/delete categories with emoji and sort order
  - Add/edit/delete products with images, price, description
  - Product customization via modifier groups
  - **Custom confirmation dialogs** for delete operations (not native `confirm()`)
  - **Removed field**: `tags` (no longer used)
- **Modifiers** (`/admin/modifiers`) — Manage modifier groups and options
- **Promotions** (`/admin/promotions`) — Create promotional bundles
  - Bundle existing products with discounted price
  - Auto-calculated discount % display
  - Optional per-user purchase limit (enforced server-side via phone number)
  - Image upload with preview
- **Branding** (`/admin/branding`) — Store colors, logo, theme customization
- **Config** (`/admin/config`) — Store hours, delivery settings
- **WhatsApp** (`/admin/whatsapp`) — Message templates for WhatsApp integration

### Database schema

PostgreSQL with snake_case naming (via `UseSnakeCaseNamingConvention()`). Key relationships:

- `Tenant` → one-to-one `TenantBranding`, `DeliveryConfig`
- `Tenant` → one-to-many `BusinessHour`, `Category`, `Product`, `AdminUser`, `PageView`
- `Category` → many `Product` → many `ModifierGroup` → many `ModifierOption`
- `Product.Tags` stored as `jsonb`

IDs are `string` (GUID via `Guid.NewGuid().ToString()`), not integers.

## Local Development

### Frontend setup
```bash
cd front
# Create .env.local (or set env vars)
NEXT_PUBLIC_API_URL=http://localhost:5500 NEXT_PUBLIC_ROOT_DOMAIN=localhost npm run dev
```
- Dev server runs on `:3000`
- Subdomain routing disabled for localhost (see proxy.ts line 14-16)
- Access at `http://localhost:3000` directly (no subdomain needed)
- Admin panel at `/admin/` route

### Backend setup
```bash
cd back
dotnet run --project MorfApp.Api
```
- API runs on `:5500`
- Swagger UI at `http://localhost:5500/swagger`

### Database migrations
```bash
cd back
# Create new migration
dotnet ef migrations add AddWhatsAppMessageTemplate --project MorfApp.Infrastructure --startup-project MorfApp.Api

# Apply pending migrations
dotnet ef database update --project MorfApp.Infrastructure --startup-project MorfApp.Api
```
- Target database name (dev): `morfapp`
- Connection string: configured in `appsettings.json`

## Deployment

### Pre-Productivo (pre.morfapp.app)

Environment: Staging, same server as production, isolated ports and database.

**URLs:**
- Frontend: `https://pre.morfapp.app`
- API: `https://api-pre.morfapp.app`

**Local build & deploy to PRE:**

```bash
# Backend
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/
scp -r publish-pre/* teo@100.95.233.68:/home/teo/morfapp-pre-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"

# Frontend
cd front
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-frontend.tar.gz .next public
scp /tmp/morfapp-pre-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-web && tar -xzf /tmp/morfapp-pre-frontend.tar.gz && rm /tmp/morfapp-pre-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"
```

**Server details:**
- Backend service: `morfapp-pre-api` (port 5300, logs: `systemctl status morfapp-pre-api`)
- Frontend service: `morfapp-pre-web` (port 4000, logs: `systemctl status morfapp-pre-web`)
- Database: `morfapp_pre` (PostgreSQL)
- Cloudflare routes via tunnel (cloudflared running at 100.95.233.68)

### Producción (morfapp.app)

Same process as PRE but with production environment variables:

```bash
# Backend
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish/
scp -r publish/* teo@100.95.233.68:/home/teo/morfapp-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-api"

# Frontend
cd front
NEXT_PUBLIC_API_URL=https://api.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-frontend.tar.gz .next public
scp /tmp/morfapp-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-web && tar -xzf /tmp/morfapp-frontend.tar.gz && rm /tmp/morfapp-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-web"
```

**Server details:**
- Host: `teo@100.95.233.68` (mismo servidor que PRE)
- Backend service: `morfapp-api` (port 5500)
- Frontend service: `morfapp-web` (port 3900)
- Database: `morfapp` (PostgreSQL)
- Cloudflare routes via tunnel

---

## Ambientes (PRE y PROD)

### PRE (Pre-Productivo)

**Propósito**: Staging environment para probar cambios antes de ir a producción

| Detalle | Valor |
|---|---|
| **URLs** | Frontend: `https://pre.morfapp.app` / API: `https://api-pre.morfapp.app` |
| **Servidor** | `teo@100.95.233.68` |
| **Base de datos** | `morfapp_pre` (PostgreSQL, totalmente aislada) |
| **Backend service** | `morfapp-pre-api` (puerto 5300) |
| **Frontend service** | `morfapp-pre-web` (puerto 4000) |
| **Logs** | `systemctl status morfapp-pre-api` / `systemctl status morfapp-pre-web` |

**Instalar/actualizar PRE**:
```bash
# Backend
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/
scp -r publish-pre/* teo@100.95.233.68:/home/teo/morfapp-pre-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"

# Frontend (CRÍTICO: env vars deben ser para PRE)
cd front
rm -rf .next
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-frontend.tar.gz .next public
scp /tmp/morfapp-pre-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-web && tar -xzf /tmp/morfapp-pre-frontend.tar.gz && rm /tmp/morfapp-pre-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"
```

### PROD (Producción)

**Propósito**: Ambiente en vivo, visible para usuarios reales

| Detalle | Valor |
|---|---|
| **URLs** | Frontend: `https://morfapp.app` / API: `https://api.morfapp.app` |
| **Servidor** | `teo@100.95.233.68` (mismo servidor que PRE) |
| **Base de datos** | `morfapp` (PostgreSQL, datos reales) |
| **Backend service** | `morfapp-api` (puerto 5500) |
| **Frontend service** | `morfapp-web` (puerto 3900) |
| **Logs** | `systemctl status morfapp-api` / `systemctl status morfapp-web` |

**Instalar/actualizar PROD**:
```bash
# Backend
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish/
scp -r publish/* teo@100.95.233.68:/home/teo/morfapp-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-api"

# Frontend (CRÍTICO: env vars deben ser para PROD)
cd front
rm -rf .next
NEXT_PUBLIC_API_URL=https://api.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-frontend.tar.gz .next public
scp /tmp/morfapp-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-web && tar -xzf /tmp/morfapp-frontend.tar.gz && rm /tmp/morfapp-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-web"
```

**Verificar que está vivo**:
```bash
curl -s -o /dev/null -w "PRE API:      %{http_code}\n" https://api-pre.morfapp.app/health
curl -s -o /dev/null -w "PROD API:     %{http_code}\n" https://api.morfapp.app/health
```

Ambos deben responder `200`.

## Key constraints

- **Next.js version is 16.2.4** — read `node_modules/next/dist/docs/` before using APIs from training data; this version has breaking changes vs. Next.js 13/14.
- The `back/` and `front/` directories are entirely separate projects — never mix files into the repo root.
- Changing the root domain from `amadeo.teodc.com` to `morfapp.com` requires only updating `NEXT_PUBLIC_ROOT_DOMAIN` (front) and `App:RootDomain` (back).
- `IsCurrentlyOpen()` in `StoreController` uses UTC time; tenant timezone (`America/Argentina/Buenos_Aires`) is stored but not yet applied — noted as a TODO.

## Common mistakes to avoid

### Frontend admin routes
- **ONLY work with**: `front/src/app/admin/` directory and all routes within it
- **IGNORE**: `/store/[tenant]/admin/` directory — these are NOT used
- All admin functionality is in `front/src/app/admin/`, accessed via `/admin/` route path:
  - Local dev: `http://localhost:3000/admin`
  - PRE: `https://pre.morfapp.app/admin`
  - PROD: `https://morfapp.app/admin`

### Deployment: Environment variables MUST be set during build
- **CRITICAL ERROR**: Running `npm run build` without env vars will use `.env.local` defaults (usually pointing to PROD)
- This causes PRE frontend to hit PROD API, making PRE unusable
- **MUST use**: `NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build` for PRE
- **MUST use**: `NEXT_PUBLIC_API_URL=https://api.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build` for PROD
- Forgetting this causes the deployed frontend to not work at all

### Deployment verification
- After deploying, **always test** the actual functionality in the browser, not just HTTP status codes
- 200 response means the server is up, NOT that the feature works
- User feedback is the source of truth: if they say it doesn't work, test it first before claiming success

### URLs for each environment

**Admin Panel Access** (ALWAYS via `/admin/` route):
- **PRE Admin**: `https://pre.morfapp.app/admin`
- **PROD Admin**: `https://morfapp.app/admin`

**Tenant Storefronts**:
- **PRE Tenant**: `https://[tenant].pre.morfapp.app`
- **PROD Tenant**: `https://[tenant].morfapp.app`

**APIs**:
- **PRE API**: `https://api-pre.morfapp.app`
- **PROD API**: `https://api.morfapp.app`
