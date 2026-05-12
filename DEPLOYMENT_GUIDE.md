# Guía de Deploy: PRE y PROD

## Tabla de Contenidos
- [Requisitos](#requisitos)
- [Deploy a PRE](#deploy-a-pre)
- [Deploy a PROD](#deploy-a-prod)
- [Verificación](#verificación)
- [Troubleshooting](#troubleshooting)
- [Comandos Rápidos](#comandos-rápidos)

---

## Requisitos

**Credenciales del servidor:**
- Host: `teo@100.95.233.68`
- Contraseña sudo: `!QAZxsw2`
- Acceso via SSH configurado

**En tu máquina local:**
- .NET 9 SDK instalado (`dotnet --version`)
- Node.js 20+ instalado (`node --version`)
- Git actualizado

---

## Deploy a PRE

### 1. Backend a PRE

```bash
cd back

# Compilar para linux
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/

# Enviar al servidor
scp -r publish-pre/* teo@100.95.233.68:/home/teo/morfapp-pre-api/

# Restart servicio
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"

# Verificar
ssh teo@100.95.233.68 "systemctl status morfapp-pre-api --no-pager | head -5"
```

### 2. Frontend a PRE

```bash
cd front

# Limpiar build anterior
rm -rf .next

# Compilar CON VARIABLES DE PRE
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app \
NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app \
npm run build

# Empaquetar
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-frontend.tar.gz .next public

# Enviar y extraer
scp /tmp/morfapp-pre-frontend.tar.gz teo@100.95.233.68:/tmp/

ssh teo@100.95.233.68 << 'EOSSH'
cd /home/teo/morfapp-pre-web
rm -rf .next public
tar -xzf /tmp/morfapp-pre-frontend.tar.gz
rm /tmp/morfapp-pre-frontend.tar.gz
echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web
sleep 2
systemctl status morfapp-pre-web --no-pager | head -5
EOSSH
```

### 3. SuperAdmin a PRE

```bash
cd superadmin

# Compilar
npm run build

# Empaquetar
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-superadmin.tar.gz .next

# Enviar y extraer
scp /tmp/morfapp-pre-superadmin.tar.gz teo@100.95.233.68:/tmp/

ssh teo@100.95.233.68 << 'EOSSH'
cd /home/teo/morfapp-pre-superadmin
rm -rf .next
tar -xzf /tmp/morfapp-pre-superadmin.tar.gz
rm /tmp/morfapp-pre-superadmin.tar.gz
echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-superadmin
sleep 2
systemctl status morfapp-pre-superadmin --no-pager | head -5
EOSSH
```

---

## Deploy a PROD

### ⚠️ IMPORTANTE
**SIEMPRE verificar que las variables de entorno sean para PROD, no PRE.**
```
NEXT_PUBLIC_API_URL=https://api.morfapp.app  ← PROD
NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app
```

### 1. Backend a PROD

```bash
cd back

# Compilar para linux
dotnet publish -c Release -r linux-x64 --self-contained false -o publish/

# Enviar al servidor
scp -r publish/* teo@100.95.233.68:/home/teo/morfapp-api/

# Restart servicio
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-api"

# Verificar
ssh teo@100.95.233.68 "systemctl status morfapp-api --no-pager | head -5"
```

### 2. Frontend a PROD

```bash
cd front

# Limpiar build anterior
rm -rf .next

# Compilar CON VARIABLES DE PROD
NEXT_PUBLIC_API_URL=https://api.morfapp.app \
NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app \
npm run build

# Empaquetar
tar --exclude='.next/dev' -czf /tmp/morfapp-frontend.tar.gz .next public

# Enviar y extraer
scp /tmp/morfapp-frontend.tar.gz teo@100.95.233.68:/tmp/

ssh teo@100.95.233.68 << 'EOSSH'
cd /home/teo/morfapp-web
rm -rf .next public
tar -xzf /tmp/morfapp-frontend.tar.gz
rm /tmp/morfapp-frontend.tar.gz
echo '!QAZxsw2' | sudo -S systemctl restart morfapp-web
sleep 2
systemctl status morfapp-web --no-pager | head -5
EOSSH
```

### 3. SuperAdmin a PROD

```bash
cd superadmin

# Compilar
npm run build

# Empaquetar
tar --exclude='.next/dev' -czf /tmp/morfapp-superadmin-prod.tar.gz .next

# Enviar y extraer
scp /tmp/morfapp-superadmin-prod.tar.gz teo@100.95.233.68:/tmp/

ssh teo@100.95.233.68 << 'EOSSH'
cd /home/teo/morfapp-superadmin
rm -rf .next
tar -xzf /tmp/morfapp-superadmin-prod.tar.gz
rm /tmp/morfapp-superadmin-prod.tar.gz
echo '!QAZxsw2' | sudo -S systemctl restart morfapp-superadmin
sleep 2
systemctl status morfapp-superadmin --no-pager | head -5
EOSSH
```

---

## Verificación

### PRE
```bash
echo "=== PRE API ==="
curl -s https://api-pre.morfapp.app/health | jq .

echo "=== PRE Frontend ==="
curl -s -o /dev/null -w "%{http_code}\n" https://pre.morfapp.app

echo "=== PRE SuperAdmin ==="
curl -s -o /dev/null -w "%{http_code}\n" https://super-pre.morfapp.app
```

### PROD
```bash
echo "=== PROD API ==="
curl -s https://api.morfapp.app/health | jq .

echo "=== PROD Frontend ==="
curl -s -o /dev/null -w "%{http_code}\n" https://morfapp.app

echo "=== PROD SuperAdmin ==="
curl -s -o /dev/null -w "%{http_code}\n" https://super.morfapp.app
```

---

## Servicios en el Servidor

### PRE
| Servicio | Puerto | Directorio | Comando |
|---|---|---|---|
| API | 5300 | `/home/teo/morfapp-pre-api` | `systemctl restart morfapp-pre-api` |
| Frontend | 4000 | `/home/teo/morfapp-pre-web` | `systemctl restart morfapp-pre-web` |
| SuperAdmin | 4100 | `/home/teo/morfapp-pre-superadmin` | `systemctl restart morfapp-pre-superadmin` |

### PROD
| Servicio | Puerto | Directorio | Comando |
|---|---|---|---|
| API | 5500 | `/home/teo/morfapp-api` | `systemctl restart morfapp-api` |
| Frontend | 3900 | `/home/teo/morfapp-web` | `systemctl restart morfapp-web` |
| SuperAdmin | 3100 | `/home/teo/morfapp-superadmin` | `systemctl restart morfapp-superadmin` |

---

## Troubleshooting

### El servicio no inicia

1. **Verificar logs:**
   ```bash
   ssh teo@100.95.233.68 "journalctl -u morfapp-api -n 50 --no-pager"
   ```

2. **Puerto ya en uso:**
   ```bash
   ssh teo@100.95.233.68 "ss -tlnp | grep :5500"  # PROD API
   ssh teo@100.95.233.68 "ss -tlnp | grep :3100"  # PROD SuperAdmin
   ```

3. **Matar proceso en puerto:**
   ```bash
   ssh teo@100.95.233.68 "kill -9 <PID>"
   ```

### Frontend dice "Cannot find module"

**Causa:** Variables de entorno faltantes en el build.

**Solución:** Asegurate de compilar CON las variables:
```bash
NEXT_PUBLIC_API_URL=https://api.morfapp.app npm run build
```

### API retorna errores de conexión a BD

**Causa:** String de conexión incorrecto en `appsettings.json`.

**Verificar en servidor:**
```bash
ssh teo@100.95.233.68 "grep -i connectionstring /home/teo/morfapp-api/appsettings.json"
```

---

## Comandos Rápidos

### Deploy TODO en PRE (Backend + Frontend + SuperAdmin)
```bash
# Backend
cd back && dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/ && \
scp -r publish-pre/* teo@100.95.233.68:/home/teo/morfapp-pre-api/ && \
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"

# Frontend
cd ../front && rm -rf .next && \
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build && \
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-frontend.tar.gz .next public && \
scp /tmp/morfapp-pre-frontend.tar.gz teo@100.95.233.68:/tmp/ && \
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-web && rm -rf .next public && tar -xzf /tmp/morfapp-pre-frontend.tar.gz && echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"

# SuperAdmin
cd ../superadmin && npm run build && \
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-superadmin.tar.gz .next && \
scp /tmp/morfapp-pre-superadmin.tar.gz teo@100.95.233.68:/tmp/ && \
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-superadmin && rm -rf .next && tar -xzf /tmp/morfapp-pre-superadmin.tar.gz && echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-superadmin"
```

### Deploy TODO en PROD (Backend + Frontend + SuperAdmin)
```bash
# Backend
cd back && dotnet publish -c Release -r linux-x64 --self-contained false -o publish/ && \
scp -r publish/* teo@100.95.233.68:/home/teo/morfapp-api/ && \
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-api"

# Frontend
cd ../front && rm -rf .next && \
NEXT_PUBLIC_API_URL=https://api.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build && \
tar --exclude='.next/dev' -czf /tmp/morfapp-frontend.tar.gz .next public && \
scp /tmp/morfapp-frontend.tar.gz teo@100.95.233.68:/tmp/ && \
ssh teo@100.95.233.68 "cd /home/teo/morfapp-web && rm -rf .next public && tar -xzf /tmp/morfapp-frontend.tar.gz && echo '!QAZxsw2' | sudo -S systemctl restart morfapp-web"

# SuperAdmin
cd ../superadmin && npm run build && \
tar --exclude='.next/dev' -czf /tmp/morfapp-superadmin-prod.tar.gz .next && \
scp /tmp/morfapp-superadmin-prod.tar.gz teo@100.95.233.68:/tmp/ && \
ssh teo@100.95.233.68 "cd /home/teo/morfapp-superadmin && rm -rf .next && tar -xzf /tmp/morfapp-superadmin-prod.tar.gz && echo '!QAZxsw2' | sudo -S systemctl restart morfapp-superadmin"
```

### Ver status de todos los servicios en PROD
```bash
ssh teo@100.95.233.68 << 'EOSSH'
echo "=== PROD Services ==="
echo "API:"
systemctl status morfapp-api --no-pager | grep -E "Active|Main PID"
echo ""
echo "Frontend:"
systemctl status morfapp-web --no-pager | grep -E "Active|Main PID"
echo ""
echo "SuperAdmin:"
systemctl status morfapp-superadmin --no-pager | grep -E "Active|Main PID"
EOSSH
```

---

## Notas Importantes

1. **Variables de entorno:** El build de Next.js DEBE incluir `NEXT_PUBLIC_API_URL`. Sin esto, el frontend apuntará a la URL incorrecta.

2. **Cloudflare:** Los subdomios se mapean vía `/etc/cloudflared/config.yml` en el servidor. Si cambias puertos, actualiza ahí también.

3. **Base de datos:** 
   - PRE usa `morfapp_pre` (aislada)
   - PROD usa `morfapp` (datos reales)

4. **Seguridad:** Nunca hardcodees contraseñas en el repo. La contraseña sudo (`!QAZxsw2`) solo está aquí como referencia de deployment.

5. **Verificación post-deploy:** SIEMPRE verifica la salud de los servicios antes de dar por completado un deployment.

