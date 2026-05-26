# MorfApp — Infraestructura & Deploy

> Actualizado: 26/05/2026

---

## 🗺️ Arquitectura general

```
Internet
   │
   ├── morfapp.app / *.morfapp.app  →  Cloudflare Tunnel (cuenta Mateo)
   │                                       │
   │                               ┌───────┴────────┐
   │                               │  teoserver      │  100.95.233.68
   │                               │  (PROD)         │
   │                               └───────┬────────┘
   │                                       │  morfapp-api      :5500
   │                                       │  morfapp-web      :3900
   │                                       │  morfapp-superadmin :3800
   │
   └── pre.morfapp.app / *         →  Cloudflare Tunnel (cuenta Mateo)
   │   super-pre / api-pre              │
   │                               ┌───────┴────────┐
   │                               │  leito server   │  100.73.32.33
   │                               │  (PRE)          │
   │                               └───────┬────────┘
   │                                       │  morfapp-pre-api      :5300
   │                                       │  morfapp-pre-web      :4000
   │                                       │  morfapp-pre-superadmin :3100
   │
   └── *.lmstores.com              →  Cloudflare Tunnel (cuenta primo)
                                        │  apps del primo (pokemon, technews, etc.)
```

---

## 🖥️ Servidores

### PROD — teoserver

| Campo | Valor |
|---|---|
| **IP Tailscale** | `100.95.233.68` |
| **Usuario SSH** | `teo` |
| **Contraseña** | `!QAZxsw2` |
| **OS** | Ubuntu 24.04 LTS |

```bash
ssh teo@100.95.233.68
```

#### Todos los servicios en teoserver

| Servicio systemd | Puerto | URL pública |
|---|---|---|
| `morfapp-api` | 5500 | https://api.morfapp.app |
| `morfapp-web` | 3900 | https://dev.morfapp.app / `*.morfapp.app` |
| `morfapp-superadmin` | 3150 | https://super.morfapp.app |
| `morfapp-landing` | 3099 | https://morfapp.app |
| `jenkins` | 8081 | https://jenkins.morfapp.app |
| `precioya-api` | 5100 | https://api-precioya.teodc.com |
| `precioya-frontend` | 3100 | https://precioya.teodc.com |
| `promiedos-api` | 8080 | https://liga.teodc.com |
| `promiedos-scraper` | — | (interno) |
| `dolar-app` | 8000 | https://dolarapp.teodc.com |
| `dolar-scraper` | — | (interno) |
| `psicoapp-api` | 5400 | https://api-psicoapp.teodc.com |
| `psicoapp-frontend` | 3400 | https://psicoapp.teodc.com |
| `aulavirtual` | 3700 | https://avstv.teodc.com + https://aulavirtual.teodc.com |
| `combustible-api` | 8001 | https://api-combustible.teodc.com |
| `combustible-frontend` | 3600 | https://combustible.teodc.com |
| `basecamp-game` | 3800 | https://basecamp-game.teodc.com |
| `hilo-api` | 5080 | https://hilo-api.teodc.com |
| `hilo-web` | 3000 | https://hilo.teodc.com |
| `divvy-api` | — | https://divvy.teodc.com (API) |
| `divvy-frontend` | — | https://divvy.teodc.com |
| `identitymodule` | — | (interno) |
| `cloudflared` | — | Tunnel Cloudflare (ver abajo) |
| `nginx` | 80/443 | Reverse proxy local |
| `postgresql` | 5432 | DB local |
| `redis-server` | 6379 | Cache |
| `docker` | — | Containers |

#### Tunnel Cloudflare teoserver

- **Tunnel ID**: `64358d35-f78d-426e-b221-3225bb277276`
- **Cuenta CF**: cuenta de Mateo
- **Config**: `/etc/cloudflared/config.yml` (en teoserver)
- **Rutas completas**:

| Hostname | Puerto local |
|---|---|
| `api.morfapp.app` | 5500 |
| `dev.morfapp.app` | 3900 |
| `*.morfapp.app` | 3900 |
| `morfapp.app` | 3099 |
| `super.morfapp.app` | 3150 |
| `jenkins.morfapp.app` | 8081 |
| `api-amadeo.teodc.com` | 5500 |
| `amadeo.teodc.com` | 3900 |
| `teodc.com` | 3500 |
| `monitor.teodc.com` | 61208 |
| `precioya.teodc.com` | 3100 |
| `api-precioya.teodc.com` | 5100 |
| `liga.teodc.com` | 8080 |
| `dolarapp.teodc.com` | 8000 |
| `api-psicoapp.teodc.com` | 5400 |
| `psicoapp.teodc.com` | 3400 |
| `avstv.teodc.com` | 3200 |
| `aulavirtual.teodc.com` | 3700 |
| `combustible.teodc.com` | 3600 |
| `api-combustible.teodc.com` | 8001 |
| `basecamp-game.teodc.com` | 3800 |
| `hilo.teodc.com` | 3000 |
| `hilo-api.teodc.com` | 5080 |
| `classic.teodc.com` | 4200 |

```bash
# Ver estado del tunnel
ssh teo@100.95.233.68 "systemctl status cloudflared"

# Reiniciar tunnel
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart cloudflared"

# Reiniciar cualquier servicio (reemplazar <nombre>)
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart <nombre>.service"

# Ver logs de un servicio
ssh teo@100.95.233.68 "journalctl -u <nombre>.service -n 50 --no-pager"
```

> ⚠️ **ATENCIÓN**: el tunnel de teoserver también tenía rutas de morfapp-pre apuntando a puertos locales (`super-pre.morfapp.app` → 4100, `pre.morfapp.app` → 4000, `api-pre.morfapp.app` → 5300). Esas rutas siguen en el config pero el tráfico real va al servidor del primo via el tunnel `cloudflared-morfapp`. Si se deshabilitan esas rutas en teoserver no afecta nada.

### PRE — servidor del primo (leito)

| Campo | Valor |
|---|---|
| **IP Tailscale** | `100.73.32.33` ✅ fija, funciona desde cualquier red |
| **IP local** | `192.168.0.120` ⚠️ puede cambiar si se reinicia el router |
| **Usuario SSH** | `leito` |
| **Contraseña** | `!QAZxsw2` |
| **OS** | Ubuntu 24.04 LTS |

```bash
ssh leito@100.73.32.33
```

> La clave SSH de `mate_@BOOK-A4PVPIO9DR` ya está autorizada — sin contraseña.

---

## 🌐 URLs

### PROD

| Servicio | URL |
|---|---|
| Tienda demo | https://dev.morfapp.app/ |
| Admin panel | https://dev.morfapp.app/admin |
| SuperAdmin | https://super.morfapp.app/ |
| API | https://api.morfapp.app/ |
| API Health | https://api.morfapp.app/health |

### PRE (servidor del primo)

| Servicio | URL |
|---|---|
| Tienda demo PRE | https://pre.morfapp.app/ |
| Admin panel PRE | https://pre.morfapp.app/admin |
| SuperAdmin PRE | https://super-pre.morfapp.app/ |
| API PRE | https://api-pre.morfapp.app/ |
| API Health PRE | https://api-pre.morfapp.app/health |

---

## 🔑 Credenciales

### SuperAdmin PRE

| Campo | Valor |
|---|---|
| URL | https://super-pre.morfapp.app/ |
| Email | `super@morfapp.app` |
| Contraseña | `Super1234!` |

### Admin del tenant demo "pre" (PRE)

| Campo | Valor |
|---|---|
| URL | https://pre.morfapp.app/admin |
| Email | `admin@pre.morfapp.app` |
| Contraseña | `Admin1234!` |

### SuperAdmin PROD

| Campo | Valor |
|---|---|
| URL | https://super.morfapp.app/ |
| Email | `super@morfapp.app` |
| Contraseña | (la del PROD — ver `.env` en teoserver) |

---

## ⚙️ Servicios en cada servidor

### PROD — teoserver (`teo@100.95.233.68`)

| Servicio systemd | Puerto | Descripción |
|---|---|---|
| `morfapp-api` | 5500 | .NET 9 backend PROD |
| `morfapp-web` | 3900 | Next.js frontend PROD |
| `morfapp-superadmin` | 3800 | SuperAdmin standalone PROD |
| `cloudflared` | — | Tunnel Cloudflare PROD |

```bash
# Ver estado
ssh teo@100.95.233.68 "systemctl status morfapp-api morfapp-web morfapp-superadmin"

# Reiniciar servicios
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-api"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-web"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-superadmin"
```

### PRE — servidor primo (`leito@100.73.32.33`)

| Servicio systemd | Puerto | Descripción |
|---|---|---|
| `morfapp-pre-api` | 5300 | .NET 9 backend PRE |
| `morfapp-pre-web` | 4000 | Next.js frontend PRE |
| `morfapp-pre-superadmin` | 3100 | SuperAdmin standalone PRE |
| `cloudflared-morfapp` | — | Tunnel Cloudflare PRE (morfapp.app) |
| `cloudflared` | — | Tunnel Cloudflare del primo (lmstores.com) |

```bash
# Ver estado
ssh leito@100.73.32.33 "systemctl status morfapp-pre-api morfapp-pre-web morfapp-pre-superadmin"

# Reiniciar servicios
ssh leito@100.73.32.33 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"
ssh leito@100.73.32.33 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"
ssh leito@100.73.32.33 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-superadmin"
```

---

## 🗄️ Bases de datos

### PROD
- **DB**: `morfapp` en PostgreSQL
- **Host**: `localhost` (teoserver)

### PRE
- **DB**: `morfapp_pre` en PostgreSQL
- **Host**: `localhost` (leito server)
- **Usuario**: `morfapp`
- **Contraseña**: `morfapp123`

```bash
# Acceder a la DB de PRE
ssh leito@100.73.32.33 "psql -U morfapp -d morfapp_pre"
```

---

## 🚀 Deploy Manual

### Branch workflow

```
master (PROD) ← development (PRE) ← feature branches
```

### Variables de entorno por ambiente

| Variable | PRE | PROD |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-pre.morfapp.app` | `https://api.morfapp.app` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `morfapp.app` | `morfapp.app` |

> ⚠️ CRÍTICO: `NEXT_PUBLIC_ROOT_DOMAIN` es `morfapp.app` en AMBOS ambientes.
> Los subdominios de tenant son `[slug].morfapp.app` (PROD) — misma lógica en PRE con `pre.morfapp.app`.

---

### Deploy PRE — Backend (.NET)

```bash
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/
scp -r publish-pre/* leito@100.73.32.33:/home/leito/morfapp-pre-api/
ssh leito@100.73.32.33 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"
```

### Deploy PRE — Frontend (Next.js)

```bash
cd front && rm -rf .next
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' --exclude='.next/cache' -czf /tmp/morfapp-pre-frontend.tar.gz .next public package.json
scp /tmp/morfapp-pre-frontend.tar.gz leito@100.73.32.33:/tmp/
ssh leito@100.73.32.33 "cd /home/leito/morfapp-pre-web && tar -xzf /tmp/morfapp-pre-frontend.tar.gz && rm /tmp/morfapp-pre-frontend.tar.gz"
ssh leito@100.73.32.33 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"
```

### Deploy PRE — SuperAdmin

```bash
cd superadmin && rm -rf .next
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app npm run build
tar --exclude='.next/dev' --exclude='.next/cache' -czf /tmp/morfapp-pre-superadmin.tar.gz .next public package.json
scp /tmp/morfapp-pre-superadmin.tar.gz leito@100.73.32.33:/tmp/
ssh leito@100.73.32.33 "cd /home/leito/morfapp-pre-superadmin && tar -xzf /tmp/morfapp-pre-superadmin.tar.gz && rm /tmp/morfapp-pre-superadmin.tar.gz"
ssh leito@100.73.32.33 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-superadmin"
```

---

### Deploy PROD — Backend (.NET)

```bash
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish/
scp -r publish/* teo@100.95.233.68:/home/teo/morfapp-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-api"
```

### Deploy PROD — Frontend (Next.js)

```bash
cd front && rm -rf .next
NEXT_PUBLIC_API_URL=https://api.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' --exclude='.next/cache' -czf /tmp/morfapp-frontend.tar.gz .next public package.json
scp /tmp/morfapp-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-web && tar -xzf /tmp/morfapp-frontend.tar.gz && rm /tmp/morfapp-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-web"
```

### Deploy PROD — SuperAdmin

```bash
cd superadmin && rm -rf .next
NEXT_PUBLIC_API_URL=https://api.morfapp.app npm run build
tar --exclude='.next/dev' --exclude='.next/cache' -czf /tmp/morfapp-superadmin.tar.gz .next public package.json
scp /tmp/morfapp-superadmin.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-superadmin && tar -xzf /tmp/morfapp-superadmin.tar.gz && rm /tmp/morfapp-superadmin.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-superadmin"
```

---

## ✅ Verificar que todo funciona

```bash
curl -s -o /dev/null -w "PRE  tienda:     %{http_code}\n" https://pre.morfapp.app/
curl -s -o /dev/null -w "PRE  admin:      %{http_code}\n" https://pre.morfapp.app/admin
curl -s -o /dev/null -w "PRE  superadmin: %{http_code}\n" https://super-pre.morfapp.app/
curl -s -o /dev/null -w "PRE  api health: %{http_code}\n" https://api-pre.morfapp.app/health

curl -s -o /dev/null -w "PROD tienda:     %{http_code}\n" https://dev.morfapp.app/
curl -s -o /dev/null -w "PROD admin:      %{http_code}\n" https://dev.morfapp.app/admin
curl -s -o /dev/null -w "PROD superadmin: %{http_code}\n" https://super.morfapp.app/
curl -s -o /dev/null -w "PROD api health: %{http_code}\n" https://api.morfapp.app/health
```

---

## 🌐 Cómo funciona el routing de tenants

El archivo `front/src/proxy.ts` es el middleware de Next.js 16. Intercepta cada request y reescribe la URL según el subdominio:

```
dev.morfapp.app/          →  /store/dev/        (tienda pública del tenant "dev")
dev.morfapp.app/admin     →  /admin             (panel admin del tenant "dev")
admin.morfapp.app/        →  /admin/            (mismo admin, acceso por subdominio)
morfapp.app/              →  page.tsx           (root — redirige a /store/dev en dev local)
```

**Para PRE**: `pre.morfapp.app` funciona igual — `pre` es el slug del tenant de demo.

Para crear un nuevo tenant en PRE o PROD usá el SuperAdmin.

---

## 🔧 Cloudflare Tunnels

### Tunnel PROD (teoserver)

- **Tunnel ID**: (ver en teoserver `/etc/cloudflared/config.yml`)
- **Servicio**: `cloudflared` (systemd)
- **Rutas**: `*.morfapp.app`, `morfapp.app`, `super.morfapp.app`, `api.morfapp.app`

### Tunnel lmstores.com (leito server) — apps del primo

> ⚠️ **NUNCA reinstalar cloudflared en el servidor del primo sin recrear este servicio después.**
> Reinstalar cloudflared borra el servicio systemd y tira abajo todas las apps de lmstores.com.

- **Tunnel ID**: `203e272f-ee46-44df-85a7-d2ebf2d097b5`
- **Cuenta CF**: cuenta del primo (lmstores.com)
- **Servicio**: `cloudflared` (systemd)
- **Config**: `/etc/cloudflared/config.yml`
- **Rutas**:
  - `pokemon.lmstores.com` → `http://localhost:3005`
  - `technews.lmstores.com` → `http://localhost:3006`
  - `chat.lmstores.com` → `http://localhost:3010`
  - `carshandbook.lmstores.com` → `http://localhost:3007`
  - `forge-api.lmstores.com` → `http://localhost:3008`
  - `monitor.lmstores.com` → `http://localhost:61208`

```bash
# Ver estado
ssh leito@100.73.32.33 "systemctl status cloudflared"

# Reiniciar
ssh leito@100.73.32.33 "echo '!QAZxsw2' | sudo -S systemctl restart cloudflared"
```

#### Si el servicio cloudflared desaparece (unidad no encontrada)

```bash
# 1. Crear el servicio systemd
cat > /tmp/cloudflared.service << 'EOF'
[Unit]
Description=cloudflared - Tunnel lmstores.com
After=network-online.target
Wants=network-online.target

[Service]
TimeoutStartSec=0
Type=notify
ExecStart=/usr/local/bin/cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# 2. Instalarlo y arrancarlo
scp /tmp/cloudflared.service leito@100.73.32.33:/tmp/
ssh leito@100.73.32.33 "
  echo '!QAZxsw2' | sudo -S cp /tmp/cloudflared.service /etc/systemd/system/cloudflared.service &&
  echo '!QAZxsw2' | sudo -S systemctl daemon-reload &&
  echo '!QAZxsw2' | sudo -S systemctl enable cloudflared &&
  echo '!QAZxsw2' | sudo -S systemctl start cloudflared
"
```

---

### Tunnel PRE morfapp.app (leito server)

- **Tunnel ID**: `bc007306-e37a-4719-b6dd-0f3e7aa7ba74`
- **Cuenta CF**: cuenta de Mateo (`morfapp.app`)
- **Servicio**: `cloudflared-morfapp` (systemd)
- **Config**: `/etc/cloudflared-morfapp/config.yml`
- **Rutas**:
  - `api-pre.morfapp.app` → `http://localhost:5300`
  - `pre.morfapp.app` → `http://localhost:4000`
  - `super-pre.morfapp.app` → `http://localhost:3100`

```bash
# Ver estado del tunnel PRE
ssh leito@100.73.32.33 "systemctl status cloudflared-morfapp"

# Reiniciar tunnel PRE
ssh leito@100.73.32.33 "echo '!QAZxsw2' | sudo -S systemctl restart cloudflared-morfapp"
```

---

## 📁 Directorios en los servidores

### leito server (PRE)

```
/home/leito/
├── morfapp-pre-api/        # .NET backend PRE
│   └── .env                # variables de entorno backend
├── morfapp-pre-web/        # Next.js frontend PRE
│   ├── .next/
│   └── public/
└── morfapp-pre-superadmin/ # SuperAdmin PRE
    ├── .next/
    └── public/
```

### teoserver (PROD)

```
/home/teo/
├── morfapp-api/            # .NET backend PROD          (puerto 5500)
├── morfapp-web/            # Next.js frontend PROD      (puerto 3900)
├── morfapp-superadmin/     # SuperAdmin PROD            (puerto 3150)
├── morfapp-landing/        # Landing page               (puerto 3099)
├── precioya/               # PrecioYA frontend          (puerto 3100)
├── precioya-api/           # PrecioYA API (.NET)        (puerto 5100)
├── promiedos/              # Liga Profesional API       (puerto 8080)
├── dolar-app/              # Dólar Blue API             (puerto 8000)
├── psicoapp/               # PsicoApp frontend          (puerto 3400)
├── psicoapp-api/           # PsicoApp API (.NET)        (puerto 5400)
├── aulavirtual/            # Aula Virtual               (puerto 3700)
├── combustible/            # Combustible frontend       (puerto 3600)
├── combustible-api/        # Combustible API            (puerto 8001)
├── basecamp-game/          # Basecamp Game              (puerto 3800)
├── hilo/                   # Hilo frontend              (puerto 3000)
├── hilo-api/               # Hilo API (.NET)            (puerto 5080)
└── divvy/                  # Divvy app
```

---

## 🔍 Checklist — antes y después de tocar cualquier servidor

### teoserver

```bash
# Verificar tunnel y servicios clave
ssh teo@100.95.233.68 "systemctl is-active cloudflared morfapp-api morfapp-web morfapp-superadmin jenkins"
# Esperado: active active active active active

# Verificar URLs
curl -s -o /dev/null -w "morfapp PROD api: %{http_code}\n" https://api.morfapp.app/health
curl -s -o /dev/null -w "morfapp PROD web: %{http_code}\n" https://dev.morfapp.app/
curl -s -o /dev/null -w "jenkins:          %{http_code}\n" https://jenkins.morfapp.app/
curl -s -o /dev/null -w "teodc.com:        %{http_code}\n" https://teodc.com/
```

### servidor del primo

El servidor del primo tiene **DOS tunnels corriendo** y **apps propias del primo**. Antes de cualquier tarea de infraestructura:

```bash
# 1. Verificar que ambos tunnels están activos
ssh leito@100.73.32.33 "systemctl is-active cloudflared && systemctl is-active cloudflared-morfapp"
# Esperado: active / active

# 2. Verificar apps lmstores.com
curl -s -o /dev/null -w "pokemon:   %{http_code}\n" https://pokemon.lmstores.com/health
curl -s -o /dev/null -w "technews:  %{http_code}\n" https://technews.lmstores.com
curl -s -o /dev/null -w "chat:      %{http_code}\n" https://chat.lmstores.com

# 3. Verificar apps morfapp PRE
curl -s -o /dev/null -w "pre web:   %{http_code}\n" https://pre.morfapp.app/
curl -s -o /dev/null -w "pre api:   %{http_code}\n" https://api-pre.morfapp.app/health
```

Después de cualquier tarea, correr el mismo checklist para confirmar que nada se rompió.

---

## ⚠️ Errores comunes

| Error | Causa | Solución |
|---|---|---|
| **lmstores.com todo caído** | Reinstalar cloudflared borra el servicio systemd `cloudflared` | Ver sección "Si el servicio cloudflared desaparece" arriba |
| Build sin env vars | `NEXT_PUBLIC_API_URL` no seteada → usa `.env.local` (PROD) | Siempre pasar `NEXT_PUBLIC_API_URL` explícito al buildear |
| `NEXT_PUBLIC_ROOT_DOMAIN` mal | Si se setea a `pre.morfapp.app` en vez de `morfapp.app`, `pre.morfapp.app` no funciona como tenant | Siempre usar `morfapp.app` como ROOT_DOMAIN en ambos ambientes |
| 404 en tienda de un tenant | No existe el tenant con ese slug en la DB | Crearlo via SuperAdmin |
| SSH `Host key verification failed` | Clave del servidor cambió (recovery mode) | `ssh-keygen -R <ip>` y reconectar con `-o StrictHostKeyChecking=no` |
| Servicio caído tras reboot | PM2 o systemd no arrancó | Ver logs: `journalctl -u morfapp-pre-api -n 50` |
| `cloudflared-morfapp` caído pero `cloudflared` OK | Solo el tunnel de morfapp se cayó | `ssh leito@100.73.32.33 "echo '!QAZxsw2' \| sudo -S systemctl restart cloudflared-morfapp"` |
