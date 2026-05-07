# Handoff: Feature Proveedores, Insumos e Inventario

**Fecha:** 2026-05-05  
**Branch:** `fix/email-and-subscription-expiry`  
**Plan completo:** `docs/plan-proveedores-insumos-inventario.md`

---

## Estado actual

### ✅ BACKEND — COMPLETO (0 errores, 0 warnings)

#### Archivos creados

**Entidades (`MorfApp.Domain/Entities/`):**
- `Supplier.cs` — Id, TenantId, Name, Phone?, Address?, Notes?, TotalDebt, IsActive, CreatedAt, UpdatedAt
- `Supply.cs` — Id, TenantId, Name, Unit?, CurrentStock, SupplierId?, IsActive, CreatedAt, UpdatedAt
- `SupplyPurchase.cs` — Id, TenantId, SupplyId, SupplierId?, QuantityPurchased, TotalPrice, PricePerUnit, PurchaseDate, Notes?, CreatedAt
- `ProductSupply.cs` — Id, TenantId, ProductId, SupplyId, QuantityRequired, IsUnknownQuantity
- `InventoryMovement.cs` — Id, TenantId, SupplyId, QuantityChange, Reason (string), ReferenceId?, CreatedAt

**DTOs (`MorfApp.Application/DTOs/Admin/`):**
- `SupplierDto.cs` — SupplierDto, CreateSupplierRequest, UpdateSupplierRequest
- `SupplyDto.cs` — SupplyDto, CreateSupplyRequest, UpdateSupplyRequest
- `SupplyPurchaseDto.cs` — SupplyPurchaseDto, CreateSupplyPurchaseRequest
- `ProductSupplyDto.cs` — ProductSupplyDto, UpdateProductSuppliesRequest, ProductSupplyItem
- `InventoryMovementDto.cs` — InventoryMovementDto

**Controladores nuevos (`MorfApp.Api/Controllers/`):**
- `SupplierController.cs` — GET/POST/PUT/DELETE `/api/admin/suppliers`
- `SupplyController.cs` — GET/POST/PUT/DELETE `/api/admin/supplies`, POST reset, GET/POST purchases, GET movements

**Migration:**
- `MorfApp.Infrastructure/Migrations/20260505161547_AddSuppliersAndInventory.cs`

#### Archivos modificados

- `MorfApp.Application/IAppDbContext.cs` — 5 DbSets nuevos agregados
- `MorfApp.Infrastructure/AppDbContext.cs` — DbSets + configuraciones de precisión en OnModelCreating
- `MorfApp.Api/Controllers/AdminController.cs` — GET + PUT `/api/admin/products/{id}/supplies`
- `MorfApp.Api/Controllers/OrdersController.cs` — `POST /{id}/confirm` descuenta inventario automáticamente

#### Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/suppliers` | Lista proveedores activos |
| POST | `/api/admin/suppliers` | Crear proveedor |
| PUT | `/api/admin/suppliers/{id}` | Editar proveedor |
| DELETE | `/api/admin/suppliers/{id}` | Soft delete proveedor |
| GET | `/api/admin/supplies` | Lista insumos activos (con nombre de proveedor) |
| POST | `/api/admin/supplies` | Crear insumo |
| PUT | `/api/admin/supplies/{id}` | Editar insumo |
| DELETE | `/api/admin/supplies/{id}` | Soft delete (bloqueado si está en uso) |
| POST | `/api/admin/supplies/{id}/reset` | Reset stock a 0 |
| GET | `/api/admin/supplies/purchases` | Historial de compras |
| POST | `/api/admin/supplies/purchases` | Registrar compra (actualiza stock + deuda proveedor) |
| GET | `/api/admin/supplies/{id}/movements` | Movimientos de un insumo |
| GET | `/api/admin/products/{id}/supplies` | Insumos asociados a un producto |
| PUT | `/api/admin/products/{id}/supplies` | Actualizar insumos de un producto |

---

### ✅ FRONTEND — COMPLETO

#### Lo que debe hacer el agente frontend

1. **Tipos TypeScript** — agregar a `front/src/types/store.ts` o crear `front/src/types/inventory.ts`:
   - SupplierDto, SupplyDto, SupplyPurchaseDto, ProductSupplyDto, InventoryMovementDto

2. **Funciones en `front/src/lib/admin-api.ts`** — agregar al final:
   - `getSuppliers`, `createSupplier`, `updateSupplier`, `deleteSupplier`
   - `getSupplies`, `createSupply`, `updateSupply`, `deleteSupply`, `resetSupplyStock`
   - `getSupplyPurchases`, `createSupplyPurchase`
   - `getSupplyMovements`
   - `getProductSupplies`, `updateProductSupplies`

3. **Nueva página** `front/src/app/admin/proveedores/page.tsx`:
   - Lista de proveedores con deuda total
   - Modal crear/editar (nombre, teléfono, dirección, notas)
   - Confirmación antes de eliminar

4. **Nueva página** `front/src/app/admin/insumos/page.tsx` (3 tabs):
   - Tab "Insumos": tabla + modal crear/editar + botón rojo "Vaciar"
   - Tab "Compras": formulario inline + historial + precio por unidad calculado
   - Tab "Movimientos": historial con motivos traducidos al español

5. **Modificar** `front/src/app/admin/menu/page.tsx`:
   - Cargar `availableSupplies` junto con los demás datos en `load()`
   - Agregar sección "Ingredientes" en el modal de crear/editar producto
   - Multi-select de insumos con cantidad + checkbox "Cantidad desconocida"
   - Al guardar producto, llamar `updateProductSupplies` si hay cambios

6. **Navegación**: agregar links "Proveedores" e "Insumos" al layout admin

---

## Para retomar en nueva sesión

### Si el agente frontend terminó
```bash
# Verificar que el frontend compile
cd front && npm run build

# Si hay errores, revisar los archivos modificados:
# - front/src/lib/admin-api.ts
# - front/src/app/admin/proveedores/page.tsx
# - front/src/app/admin/insumos/page.tsx
# - front/src/app/admin/menu/page.tsx
```

### Si el agente frontend NO terminó o falló
Retomar manualmente implementando en orden:
1. Tipos TypeScript
2. Funciones admin-api.ts
3. Página proveedores
4. Página insumos
5. Modificación menu (ingredientes)
6. Navegación

### Pendiente después del frontend (deploy)
```bash
# Backend — build y deploy a PRE
cd back
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-pre/
scp -r publish-pre/* teo@100.95.233.68:/home/teo/morfapp-pre-api/
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-api"

# Frontend — build y deploy a PRE
cd front
NEXT_PUBLIC_API_URL=https://api-pre.morfapp.app NEXT_PUBLIC_ROOT_DOMAIN=morfapp.app npm run build
tar --exclude='.next/dev' -czf /tmp/morfapp-pre-frontend.tar.gz .next public
scp /tmp/morfapp-pre-frontend.tar.gz teo@100.95.233.68:/tmp/
ssh teo@100.95.233.68 "cd /home/teo/morfapp-pre-web && tar -xzf /tmp/morfapp-pre-frontend.tar.gz && rm /tmp/morfapp-pre-frontend.tar.gz"
ssh teo@100.95.233.68 "echo '!QAZxsw2' | sudo -S systemctl restart morfapp-pre-web"
```

### Migration en PRE/PROD
La migration ya fue creada localmente. Al deployar backend en el servidor, ejecutar:
```bash
# En el servidor (o con dotnet ef apuntando a la DB de PRE)
dotnet ef database update --project MorfApp.Infrastructure --startup-project MorfApp.Api
```

---

## Notas importantes

- El frontend NO usa TanStack Query — usa useState + useCallback + useEffect directamente
- IDs son string GUIDs (`Guid.NewGuid().ToString()`)
- Snake_case en DB vía `UseSnakeCaseNamingConvention()`
- Multi-tenant: SIEMPRE filtrar por `TenantId` en cada query
- Stock puede quedar negativo — es informativo, no bloqueante
- Soft delete en Supply si tiene ProductSupply activo (el controller retorna BadRequest)
- El descuento de inventario ocurre en la misma transacción que la confirmación del pedido
- Si `IsUnknownQuantity = true`, ese ingrediente NO se descuenta del inventario
