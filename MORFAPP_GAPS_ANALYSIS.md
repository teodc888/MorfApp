# MorfApp — Análisis de Gaps y Plan de Mejoras

**Fecha:** 2026-05-20  
**Estado:** Análisis completado, pendiente aprobación de planes detallados

---

## Resumen Ejecutivo

MorfApp tiene una **arquitectura sólida** (Next.js + .NET + PostgreSQL + Jenkins) pero le faltan **10 componentes críticos** para producción enterprise:

| Área | Carencias | Impacto | Prioridad |
|---|---|---|---|
| Backend | Logging, Error Handling, Caching, Secrets | Observability, Debug, Performance | **ALTA** |
| DevOps | Tests en pipelines, DB migrations validation | Quality gate, Safety | **ALTA** |
| Frontend | UI rediseño (4 pages), Validación estándar | UX consistency, Confiabilidad | **MEDIA** |
| SuperAdmin | Auditoría, Analytics | Compliance, Insights | **MEDIA** |

---

## 1. Backend (.NET) — 4 Carencias

### 1.1 Logging Estructurado con Serilog

**Estado actual:** Sin logging centralizado.

**Necesario:**
- Implementar Serilog en `Program.cs`
- Salida dual: archivo + console
- Enriquecimiento automático con `RequestId`, `UserId`, `TenantId`
- Niveles configurables por entorno

**Archivos impactados:**
```
MorfApp.Api/Program.cs
MorfApp.Api/Controllers/*.cs
MorfApp.Infrastructure/*.cs
```

**Criterios de éxito:**
- [ ] Logs de request/response en todos los endpoints
- [ ] Stack trace en ERROR sin exponerlo al cliente
- [ ] Archivo de logs rotado por fecha
- [ ] Searchable en los logs por RequestId

---

### 1.2 Custom Exception Hierarchy + Middleware Centralizado

**Estado actual:** Excepciones genéricas, sin manejo centralizado.

**Necesario:**

Jerarquía de excepciones (AppException → ValidationException, BusinessException, UnauthorizedException, etc.)

Middleware de error handling que responda con JSON estandarizado:
```json
{
  "code": "INVALID_EMAIL",
  "message": "El email no es válido",
  "errors": [{ "field": "email", "message": "Formato inválido" }],
  "timestamp": "2026-05-20T10:40:00Z",
  "traceId": "0HN8Q6PRQO3D8:00000001"
}
```

**Archivos a crear:**
```
MorfApp.Domain/Exceptions/AppException.cs
MorfApp.Domain/Exceptions/ValidationException.cs
MorfApp.Domain/Exceptions/BusinessException.cs
MorfApp.Api/Middleware/GlobalExceptionHandler.cs
```

**Criterios de éxito:**
- [ ] Toda excepción mapeada a código error
- [ ] Errores de validación con `errors[]` detallado
- [ ] Stack trace solo en logs
- [ ] Status code HTTP correcto según tipo de error

---

### 1.3 Caching de Datos Frecuentes

**Estado actual:** Sin caché, cada request consulta BD.

**Necesario:**
- IMemoryCache para Tenant, Category, Product (datos que rara vez cambian)
- Invalidación automática cuando admin edita
- TTL: 1 hora para datos públicos, 5 min para datos de admin

**Candidatos para caché:**
- Tenant (por ID/slug)
- Category (por TenantId)
- Product (por CategoryId)
- ModifierGroup, ModifierOption
- TenantBranding

**Criterios de éxito:**
- [ ] Caché hit rate > 70% en endpoints públicos
- [ ] Latencia reducida en /api/store/menu
- [ ] Invalidación automática sin race conditions

---

### 1.4 Secrets Management

**Estado actual:** Credenciales en texto plano en Jenkins.

**Necesario:**
- HashiCorp Vault o AWS Secrets Manager
- .NET configuration provider para leer desde vault
- Documentación de cómo agregar nuevo secreto

**Secretos a mover:**
- Jwt:Secret
- ConnectionStrings:DefaultConnection
- App:PublicUrl
- Email credentials (futuro)

**Criterios de éxito:**
- [ ] Ningún secreto en git
- [ ] Vault token rotado automáticamente
- [ ] Documentación clara

---

## 2. DevOps/CI-CD — 3 Carencias

### 2.1 Tests Automáticos en Pipelines

**Estado actual:** `dotnet test` existe localmente pero NO corre en Jenkinsfiles.

**Necesario:**
- Agregar stage "Test Backend" en Jenkinsfile.pre
- Agregar stage "Test Frontend" con coverage
- En Jenkinsfile.prod: tests obligatorios, pipeline falla si alguno no pasa

**Criterios de éxito:**
- [ ] Pipeline falla si tests fallan
- [ ] Reporte de coverage visible en Jenkins
- [ ] Tests corren en < 5 min

---

### 2.2 Database Migrations Validation

**Estado actual:** No hay validación pre-deployment.

**Necesario:**
- Validar que no haya migraciones pendientes
- En PROD: requerir aprobación manual antes de aplicar
- Documentar rollback procedure

**Criterios de éxito:**
- [ ] Pipeline advierte si hay migraciones pendientes
- [ ] PROD requiere confirmación manual
- [ ] Rollback automático en caso de fallo

---

### 2.3 Monitoring y Alertas Post-Deployment

**Estado actual:** Health check básico (HTTP 200), sin monitoreo de performance.

**Necesario:**
- Datadog / New Relic para APM
- Alertas si error rate > 5%
- Alertas si latencia p95 > 2s
- Dashboard con métricas por ambiente

**Criterios de éxito:**
- [ ] Dashboard visible con métricas
- [ ] Alertas configuradas y testeadas
- [ ] Respuesta automática < 5 min ante error

---

## 3. Frontend (Next.js) — 2 Carencias

### 3.1 Rediseño UI de 4 Páginas Admin

**Estado actual:** 3 páginas rediseñadas (Orders, Metrics, Menu). Faltan:

| Página | Estado |
|---|---|
| Modifiers | ❌ Rediseño pendiente |
| Promotions | ❌ Rediseño pendiente |
| Branding | ❌ Rediseño pendiente |
| Config | ❌ Rediseño pendiente |

**Sistema de diseño disponible:** `front/src/app/globals.css` con tokens y clases reutilizables.

**Necesario:**
- Reemplazar inline Tailwind con clases del design system
- Mantener lógica de datos (React hooks, API calls, mutations)
- Seguir patrones de Orders, Metrics, Menu

**Criterios de éxito:**
- [ ] Todas las páginas usan clases del design system
- [ ] Responsive en mobile y desktop
- [ ] Lógica de datos sin cambios
- [ ] 100% funcionalidad vs. versión anterior

---

### 3.2 Validación Client-Side Estandarizada

**Estado actual:** Cada página valida diferente.

**Necesario:**
- Schema de validación centralizado (Zod o Yup)
- Custom hook `useFormValidation()` reutilizable
- Mensajes de error consistentes
- Real-time validation opcional

**Criterios de éxito:**
- [ ] Validación antes de submit
- [ ] Mensajes de error claros y consistentes
- [ ] Campos marcados como "required" en el UI

---

## 4. SuperAdmin — 2 Carencias

### 4.1 Auditoría de Cambios en Tenants

**Estado actual:** Sin historial. Cambios en tenants no se registran.

**Necesario:**
- Entidad AuditLog en backend (append-only)
- Endpoint GET /api/superadmin/audit-logs
- UI para visualizar historial de cambios
- Mostrar diff entre versiones

**Criterios de éxito:**
- [ ] Cada cambio registrado con usuario y timestamp
- [ ] Posibilidad de ver diff entre versiones
- [ ] Auditoría no se puede eliminar

---

### 4.2 Analytics e Insights de Tenants

**Estado actual:** Sin visibilidad de uso de tenants.

**Necesario:**
- Dashboard de métricas por tenant (orders, revenue, active users, page views)
- Endpoint GET /api/superadmin/analytics/tenants
- Gráficos de crecimiento y tendencias
- Filtros por período (7d, 30d, 90d)

**Criterios de éxito:**
- [ ] Dashboard carga en < 2s
- [ ] Gráficos actualizados cada 1 hora
- [ ] Filtros funcionales

---

## Plan de Implementación Recomendado

### Fase 1 — Backend Foundation (Semana 1-2)
```
1. Logging (Serilog)
2. Custom Exceptions + Middleware
3. Caching de datos públicos
```

### Fase 2 — DevOps Safety (Semana 2-3)
```
4. Tests en pipelines (backend + frontend)
5. Database migration validation
6. Secrets management
```

### Fase 3 — Frontend Polish (Semana 3-4)
```
7. Rediseño 4 páginas admin
8. Validación client-side estandarizada
```

### Fase 4 — Observability + Governance (Semana 4-5)
```
9. Auditoría en SuperAdmin
10. Analytics de tenants
11. Monitoring y alertas
```

---

## Próximos Pasos

Se invocará el orquestador correspondiente para cada área:

- [ ] **morf-back-orchestrator** → Fases 1 + 2 backend
- [ ] **morf-devops-orchestrator** → Fase 2 pipelines
- [ ] **morf-front-orchestrator** → Fase 3 frontend
- [ ] **morf-superadmin-orchestrator** → Fase 4 superadmin

**Status:** Awaiting user approval to proceed with detailed planning.
