# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- `NEXT_PUBLIC_API_URL` — public API base URL (browser)
- `NEXT_INTERNAL_API_URL` — internal API base URL (SSR, avoids network round-trip)
- `NEXT_PUBLIC_ROOT_DOMAIN` — e.g. `amadeo.teodc.com`

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

The proxy rewrites subdomains to App Router paths. The tenant admin panel is currently implemented at `src/app/store/[tenant]/admin/` (not a top-level `/admin/` route). The `/admin/` and `/superadmin/` rewrite targets are not yet created. **All tenant data is isolated by `TenantId` extracted from the JWT claim `tenant_id`.**

### Frontend (`front/src/`)

- `proxy.ts` — Next.js middleware, subdomain → path rewrite
- `app/store/[tenant]/` — public storefront (SSR, `next: { revalidate: 60 }`)
- `app/store/[tenant]/admin/` — tenant admin panel (client-side, JWT-gated); sections: branding, config, menu, modifiers, whatsapp
- `lib/api.ts` — SSR-safe fetch helpers for the store (uses `NEXT_INTERNAL_API_URL` on server)
- `lib/admin-api.ts` — authenticated fetch wrapper with automatic token refresh and retry queue
- `lib/auth.ts` — JWT storage in `localStorage` (access + refresh token)
- `store/cart.ts` — Zustand store for cart state (in-memory, not persisted)
- `types/store.ts` — shared TypeScript types for the full domain model

**State management**: TanStack Query handles server state for admin; `useCartStore` (Zustand) handles cart client state.

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

### Database schema

PostgreSQL with snake_case naming (via `UseSnakeCaseNamingConvention()`). Key relationships:

- `Tenant` → one-to-one `TenantBranding`, `DeliveryConfig`
- `Tenant` → one-to-many `BusinessHour`, `Category`, `Product`, `AdminUser`, `PageView`
- `Category` → many `Product` → many `ModifierGroup` → many `ModifierOption`
- `Product.Tags` stored as `jsonb`

IDs are `string` (GUID via `Guid.NewGuid().ToString()`), not integers.

## Key constraints

- **Next.js version is 16.2.4** — read `node_modules/next/dist/docs/` before using APIs from training data; this version has breaking changes vs. Next.js 13/14.
- The `back/` and `front/` directories are entirely separate projects — never mix files into the repo root.
- Changing the root domain from `amadeo.teodc.com` to `morfapp.com` requires only updating `NEXT_PUBLIC_ROOT_DOMAIN` (front) and `App:RootDomain` (back).
- `IsCurrentlyOpen()` in `StoreController` uses UTC time; tenant timezone (`America/Argentina/Buenos_Aires`) is stored but not yet applied — noted as a TODO.
