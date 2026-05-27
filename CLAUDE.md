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

### SuperAdmin (`superadmin/`)

Standalone Next.js app, independent from `front/`. Runs on its own port.

```bash
cd superadmin
npm run dev        # dev server on :3100
npm run build
npm run lint
```

### Backend (`back/`)

```bash
cd back
dotnet build
dotnet run --project MorfApp.Api   # API on :5500 (dev)

# Run all tests
dotnet test

# Run specific test file
dotnet test --filter "ClassName=YourTestClass"

# EF Core migrations (run from back/)
dotnet ef migrations add <MigrationName> --project MorfApp.Infrastructure --startup-project MorfApp.Api
dotnet ef database update --project MorfApp.Infrastructure --startup-project MorfApp.Api
```

Tests use xUnit + Moq + EF InMemory (`MorfApp.Tests` project).

### Environment variables

Frontend (`.env.local` inside `front/`):
- `NEXT_PUBLIC_API_URL` — public API base URL (browser). **CRITICAL for deployment**: must be set during build
- `NEXT_INTERNAL_API_URL` — internal API base URL (SSR, avoids network round-trip)
- `NEXT_PUBLIC_ROOT_DOMAIN` — e.g. `morfapp.app`

SuperAdmin (`.env.local` inside `superadmin/`):
- `NEXT_PUBLIC_API_URL` — same backend API

Backend (`appsettings.json` / env overrides):
- `ConnectionStrings:DefaultConnection` — PostgreSQL connection string
- `Jwt:Secret` — must be ≥32 chars in production
- `App:RootDomain` — used for wildcard CORS
- `App:UploadsPath` — filesystem path for uploaded images (defaults to `<contentRoot>/uploads`)
- `App:PublicUrl` — public base URL for building upload URLs returned to clients (defaults to `http://localhost:5500`)

## Architecture

### Branch workflow

```
master (production) ← development (staging) ← feature branches
```

- `development` → deploys to PRE
- `master` → deploys to PROD

### Multi-tenant subdomain model

Each tenant gets a slug (e.g. `burger`). The frontend middleware (`front/src/proxy.ts`) intercepts the hostname and rewrites paths:

| Incoming host | Rewritten path |
|---|---|
| `burger.morfapp.app` | `/store/burger/...` |
| `admin.morfapp.app` | `/admin/...` |
| `localhost` | no rewrite (dev fallback) |

The proxy rewrites subdomains to App Router paths. **Admin access is always via `/admin/` route** (not a subdomain). **All tenant data is isolated by `TenantId` extracted from the JWT claim `tenant_id`.**

The SuperAdmin app (`superadmin/`) is a **completely separate Next.js app** — it has its own login, auth, and API calls. It does NOT share code with `front/`.

### Frontend (`front/src/`)

- `proxy.ts` — Next.js middleware that rewrites subdomain requests to app routes
- `app/admin/` — **MAIN admin panel** (client-side, JWT-gated)
  - Routes: `login`, `branding`, `config`, `menu`, `modifiers`, `orders`, `promotions`, `whatsapp`, `metrics`, `insumos`, `proveedores`
  - **ONLY work here** — `app/store/[tenant]/admin/` exists but is NOT used
- `app/store/[tenant]/` — public storefront (SSR, `next: { revalidate: 60 }`)
- `lib/api.ts` — SSR-safe fetch helpers for the store (uses `NEXT_INTERNAL_API_URL` on server)
- `lib/admin-api.ts` — authenticated fetch wrapper with automatic token refresh and retry queue
- `lib/auth.ts` — JWT storage in `localStorage` (access + refresh token)
- `lib/useWebSocket.ts` — WebSocket hook for real-time order updates; auto-reconnects every 3s on disconnect; invalidates TanStack Query `['orders']` and `['metrics']` cache on events
- `store/cart.ts` — Zustand store for cart state (in-memory, not persisted)
- `types/store.ts` — shared TypeScript types for the full domain model

**State management**: TanStack Query handles server state for admin; `useCartStore` (Zustand) handles cart client state.

### SuperAdmin (`superadmin/src/`)

- `lib/superadmin-api.ts` — fetch wrappers for all `/api/superadmin/*` endpoints
- `lib/api.ts` — re-exports `adminFetch` used by superadmin-api
- `lib/auth.ts` — separate JWT storage for superadmin session
- Routes: `/` (dashboard), `/tenants`, `/tenants/new`, `/tenants/[id]/edit`, `/settings`, `/login`
- SuperAdmin JWT has `is_superadmin: true` claim; backend `SuperAdminController` validates this

### Backend (`back/`)

Clean Architecture, five projects:

| Project | Role |
|---|---|
| `MorfApp.Domain` | Entities, enums — no dependencies |
| `MorfApp.Application` | DTOs, `IAppDbContext` interface |
| `MorfApp.Infrastructure` | `AppDbContext` (EF Core), migrations |
| `MorfApp.Api` | Controllers, DI wiring, `Program.cs` |
| `MorfApp.Tests` | xUnit tests, uses EF InMemory |

Controllers inject `IAppDbContext` directly — no service/repository layer. Mapping from entities to DTOs is done in static mapper methods inside each controller.

**Controllers**:
- `AdminController` — all `/api/admin/*` endpoints (tenant-scoped)
- `AuthController` — login, refresh token
- `StoreController` — public storefront read endpoints
- `OrdersController` — order management (create, confirm, cancel)
- `SuperAdminController` — tenant management, settings (requires `is_superadmin` claim)
- `SupplierController` / `SupplyController` — inventory/supply management
- `MetricsController` — analytics and metrics
- `PublicController` — public setup endpoint for new tenants

**File uploads**: `POST /api/admin/upload` accepts multipart form data (JPG/PNG/WebP/GIF, max 5 MB). Files written to `App:UploadsPath`, served at `/uploads/<filename>`.

**Auth flow**: `POST /api/auth/login` → returns `{ accessToken, refreshToken, expiresIn }`. Access token is a 15-min JWT with claims `sub`, `email`, `is_superadmin`, `tenant_id`, `tenant_slug`. Refresh tokens stored in `refresh_tokens` table and rotated on each use. The frontend `adminFetch()` handles 401s by queuing concurrent requests and retrying after a single refresh attempt.

**Tenant isolation**: `AdminController` extracts `tenant_id` from the JWT claim on every request — **every new admin endpoint must explicitly filter by `TenantId`**. There is no global middleware enforcing this.

**WebSocket**: Backend pushes `new_order`, `order_confirmed`, `order_cancelled` events to authenticated clients at `/ws?token=<token>`. Frontend `useWebSocket.ts` handles both camelCase and PascalCase from backend.

### Admin panel features (`app/admin/`)

- **Menu** (`/admin/menu`) — categories + products, modifier groups; custom confirmation dialogs for delete (no native `confirm()`)
- **Modifiers** (`/admin/modifiers`) — modifier groups and options
- **Promotions** (`/admin/promotions`) — bundles with discounted price, optional per-user limit (enforced by phone number server-side)
- **Branding** (`/admin/branding`) — colors, logo, theme
- **Config** (`/admin/config`) — store hours, delivery settings
- **WhatsApp** (`/admin/whatsapp`) — message templates
- **Orders** (`/admin/orders`) — real-time order management via WebSocket; confirm/cancel orders
- **Metrics** (`/admin/metrics`) — analytics dashboard
- **Insumos** (`/admin/insumos`) — inventory/supply tracking
- **Proveedores** (`/admin/proveedores`) — supplier management

### Database schema

PostgreSQL with snake_case naming (via `UseSnakeCaseNamingConvention()`). Key relationships:

- `Tenant` → one-to-one `TenantBranding`, `DeliveryConfig`, `PaymentConfig`
- `Tenant` → one-to-many `BusinessHour`, `Category`, `Product`, `AdminUser`, `PageView`, `Order`, `Supplier`, `Supply`
- `Category` → many `Product` → many `ModifierGroup` → many `ModifierOption`
- `Order` → `OrderItem` (with modifier selections)
- `Supply` → many `ProductSupply` (link products to supplies), `InventoryMovement`, `SupplyPurchase`
- `Supplier` → many `SupplyPurchase`, `SupplierPayment`, `SupplierPaymentAllocation`
- `Product.Tags` stored as `jsonb`

IDs are `string` (GUID via `Guid.NewGuid().ToString()`), not integers.

## Local Development

### Frontend setup
```bash
cd front
NEXT_PUBLIC_API_URL=http://localhost:5500 NEXT_PUBLIC_ROOT_DOMAIN=localhost npm run dev
```
- Dev server on `:3000`, admin at `http://localhost:3000/admin`
- Subdomain routing disabled for localhost

### SuperAdmin setup
```bash
cd superadmin
NEXT_PUBLIC_API_URL=http://localhost:5500 npm run dev
```
- Dev server on `:3100`, access at `http://localhost:3100`

### Backend setup
```bash
cd back
dotnet run --project MorfApp.Api
```
- API on `:5500`, Swagger at `http://localhost:5500/swagger`

### Database migrations
```bash
cd back
dotnet ef migrations add <MigrationName> --project MorfApp.Infrastructure --startup-project MorfApp.Api
dotnet ef database update --project MorfApp.Infrastructure --startup-project MorfApp.Api
```
- Dev database: `morfapp` (PostgreSQL)

## Deployment

### CI/CD — Jenkins

Two Jenkinsfiles at repo root — triggered via Jenkins at `jenkins.morfapp.app`:

| File | Target | Trigger |
|---|---|---|
| `Jenkinsfile.pre` | PRE | Auto on push |
| `Jenkinsfile.prod` | PROD | Manual, requires `CONFIRM_PRODUCTION=true` |

Each pipeline has a `DEPLOY_WHAT` parameter: `backend`, `frontend`, `superadmin`, `both` (backend+frontend), or `all`.

### Ambientes

| | PRE | PROD |
|---|---|---|
| Frontend | `https://pre.morfapp.app` | `https://morfapp.app` |
| API | `https://api-pre.morfapp.app` | `https://api.morfapp.app` |
| SuperAdmin | `https://super-pre.morfapp.app` | `https://super.morfapp.app` |
| Admin panel | `https://pre.morfapp.app/admin` | `https://morfapp.app/admin` |
| Backend service | `morfapp-pre-api` (port 5300) | `morfapp-api` (port 5500) |
| Frontend service | `morfapp-pre-web` (port 4000) | `morfapp-web` (port 3900) |
| SuperAdmin service | `morfapp-pre-superadmin` | `morfapp-superadmin` |
| Database | `morfapp_pre` | `morfapp` |
| Server | `teo@100.95.233.68` | `teo@100.95.233.68` |

### Manual deploy to PRE

```bash
# Backend
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/
scp -r publish-pre/* teo@100.95.233.68:/home/teo/morfapp-pre-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"

# Frontend (CRÍTICO: env vars deben ser para PRE)
cd front && rm -rf .next
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-frontend.tar.gz .next public
scp /tmp/morfapp-pre-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-web && tar -xzf /tmp/morfapp-pre-frontend.tar.gz && rm /tmp/morfapp-pre-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"

# SuperAdmin
cd superadmin && rm -rf .next
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-superadmin.tar.gz .next public
scp /tmp/morfapp-pre-superadmin.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-superadmin && tar -xzf /tmp/morfapp-pre-superadmin.tar.gz && rm /tmp/morfapp-pre-superadmin.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-superadmin"
```

### Manual deploy to PROD

```bash
# Backend
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish/
scp -r publish/* teo@100.95.233.68:/home/teo/morfapp-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-api"

# Frontend
cd front && rm -rf .next
NEXT_PUBLIC_API_URL=https://api.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-frontend.tar.gz .next public
scp /tmp/morfapp-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-web && tar -xzf /tmp/morfapp-frontend.tar.gz && rm /tmp/morfapp-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-web"

# SuperAdmin
cd superadmin && rm -rf .next
NEXT_PUBLIC_API_URL=https://api.morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-superadmin.tar.gz .next public
scp /tmp/morfapp-superadmin.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-superadmin && tar -xzf /tmp/morfapp-superadmin.tar.gz && rm /tmp/morfapp-superadmin.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-superadmin"
```

**Verificar**:
```bash
curl -s -o /dev/null -w "PRE API:  %{http_code}\n" https://api-pre.morfapp.app/health
curl -s -o /dev/null -w "PROD API: %{http_code}\n" https://api.morfapp.app/health
```

## Key constraints

- **Next.js version is 16.2.4** — read `node_modules/next/dist/docs/` before using APIs from training data; this version has breaking changes vs. Next.js 13/14.
- The `back/`, `front/`, and `superadmin/` directories are entirely separate projects — never mix files into the repo root.
- `IsCurrentlyOpen()` in `StoreController` uses UTC time; tenant timezone (`America/Argentina/Buenos_Aires`) is stored but not yet applied — TODO.

## Common mistakes to avoid

- **Admin routes**: ONLY work in `front/src/app/admin/`. The `app/store/[tenant]/admin/` directory is NOT used.
- **SuperAdmin vs Admin**: SuperAdmin (`superadmin/` app) manages tenants at platform level. Admin (`front/app/admin/`) manages a single tenant's menu, orders, etc. They are different apps with different auth.
- **Deployment env vars**: Running `npm run build` without env vars uses `.env.local` defaults (usually PROD). Always pass `NEXT_PUBLIC_API_URL` explicitly during build.
- **After deploying**: always test actual functionality in the browser. A 200 status means the server is up, not that the feature works.
- **Tenant isolation**: every new `AdminController` endpoint must explicitly filter by `TenantId` — there is no global middleware.
