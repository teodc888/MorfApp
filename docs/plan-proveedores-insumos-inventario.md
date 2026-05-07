# Plan: Proveedores, Insumos e Inventario

**Fecha:** 2026-05-05  
**Branch:** fix/email-and-subscription-expiry  
**Estado:** Pendiente de implementación

---

## Resumen del feature

Sistema de gestión de insumos, inventario y proveedores visible desde el panel admin. Permite:
- CRUD de proveedores con control de deuda
- CRUD de insumos con stock en tiempo real
- Registrar compras de insumos (actualiza stock y deuda con proveedor)
- Asociar ingredientes a productos (con cantidad requerida o "desconocida")
- Descuento automático de inventario al confirmar un pedido

---

## Fase 1 — Entidades de dominio (Domain)

### `Supplier` (Proveedor)
```csharp
string Id           // Guid.NewGuid().ToString()
string TenantId
string Name         // obligatorio
string? Phone
string? Address
string? Notes
decimal TotalDebt   // default 0 — acumulado de compras
bool IsActive       // default true
DateTime CreatedAt
DateTime UpdatedAt
```

### `Supply` (Insumo)
```csharp
string Id
string TenantId
string Name         // obligatorio
string? Unit        // "kg", "litros", "unidades", null = "por unidad/vacío"
decimal CurrentStock // default 0
string? SupplierId  // FK nullable
bool IsActive
DateTime CreatedAt
DateTime UpdatedAt
```

### `SupplyPurchase` (Compra de insumo)
```csharp
string Id
string TenantId
string SupplyId       // FK Supply
string? SupplierId    // FK Supplier nullable
decimal QuantityPurchased
decimal TotalPrice
decimal PricePerUnit  // calculado: TotalPrice / QuantityPurchased
DateTime PurchaseDate // default UtcNow
string? Notes
DateTime CreatedAt
```

### `ProductSupply` (Ingrediente de un producto — junction)
```csharp
string Id
string TenantId
string ProductId            // FK Product
string SupplyId             // FK Supply
decimal QuantityRequired    // cuánto insumo se usa por unidad del producto
bool IsUnknownQuantity      // true = no descontar al confirmar pedido (ej: lechuga)
```

### `InventoryMovement` (Auditoría)
```csharp
string Id
string TenantId
string SupplyId         // FK Supply
decimal QuantityChange  // negativo = descuento, positivo = ingreso
string Reason           // enum: Purchase | OrderDeducted | ManualReset | ManualAdjust
string? ReferenceId     // OrderId o PurchaseId
DateTime CreatedAt
```

---

## Fase 2 — Migrations EF Core

```bash
cd back
dotnet ef migrations add AddSuppliersAndInventory --project MorfApp.Infrastructure --startup-project MorfApp.Api
dotnet ef database update --project MorfApp.Infrastructure --startup-project MorfApp.Api
```

Registrar en `AppDbContext`:
```csharp
public DbSet<Supplier> Suppliers => Set<Supplier>();
public DbSet<Supply> Supplies => Set<Supply>();
public DbSet<SupplyPurchase> SupplyPurchases => Set<SupplyPurchase>();
public DbSet<ProductSupply> ProductSupplies => Set<ProductSupply>();
public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
```

---

## Fase 3 — API Endpoints

### `SupplierController` → `/api/admin/suppliers`

| Método | Ruta          | Descripción                                |
|--------|---------------|--------------------------------------------|
| GET    | `/`           | Listar proveedores del tenant              |
| POST   | `/`           | Crear proveedor                            |
| PUT    | `/{id}`       | Editar proveedor                           |
| DELETE | `/{id}`       | Eliminar proveedor (soft delete IsActive)  |

**SupplierDto:**
```json
{
  "id": "...",
  "name": "Distribuidora Norte",
  "phone": "+54911...",
  "address": "Av. Siempreviva 742",
  "notes": "...",
  "totalDebt": 15000.00,
  "isActive": true,
  "createdAt": "2026-05-05T..."
}
```

**CreateSupplierRequest:**
```json
{
  "name": "Distribuidora Norte",   // required, MaxLength(200)
  "phone": "...",                  // optional
  "address": "...",                // optional
  "notes": "..."                   // optional
}
```

---

### `SupplyController` → `/api/admin/supplies`

| Método | Ruta                | Descripción                                          |
|--------|---------------------|------------------------------------------------------|
| GET    | `/`                 | Listar insumos del tenant (incluye proveedor)        |
| POST   | `/`                 | Crear insumo                                         |
| PUT    | `/{id}`             | Editar insumo                                        |
| DELETE | `/{id}`             | Eliminar insumo (soft delete si no tiene ProductSupply) |
| POST   | `/{id}/reset`       | Vaciar stock (CurrentStock = 0, crea InventoryMovement ManualReset) |
| GET    | `/purchases`        | Historial de compras del tenant                      |
| POST   | `/purchases`        | Registrar compra → actualiza CurrentStock + TotalDebt del proveedor |
| GET    | `/{id}/movements`   | Historial de movimientos de un insumo                |

**SupplyDto:**
```json
{
  "id": "...",
  "name": "Harina",
  "unit": "kg",
  "currentStock": 12.5,
  "supplierId": "...",
  "supplierName": "Distribuidora Norte",
  "isActive": true
}
```

**CreateSupplyRequest:**
```json
{
  "name": "Harina",         // required
  "unit": "kg",             // optional
  "supplierId": "..."       // optional
}
```

**CreateSupplyPurchaseRequest:**
```json
{
  "supplyId": "...",            // required
  "supplierId": "...",          // optional
  "quantityPurchased": 50.0,    // required, > 0
  "totalPrice": 2500.00,        // required, > 0
  "notes": "..."                // optional
}
```

**SupplyPurchaseDto:**
```json
{
  "id": "...",
  "supplyId": "...",
  "supplyName": "Harina",
  "supplierId": "...",
  "supplierName": "...",
  "quantityPurchased": 50.0,
  "totalPrice": 2500.00,
  "pricePerUnit": 50.00,
  "notes": "...",
  "purchaseDate": "2026-05-05T..."
}
```

---

### Endpoints en `AdminController` (productos)

| Método | Ruta                          | Descripción                              |
|--------|-------------------------------|------------------------------------------|
| GET    | `/api/admin/products/{id}/supplies` | Ingredientes de un producto        |
| PUT    | `/api/admin/products/{id}/supplies` | Reemplazar ingredientes de un producto |

**ProductSupplyDto:**
```json
{
  "supplyId": "...",
  "supplyName": "Harina",
  "unit": "kg",
  "quantityRequired": 0.2,
  "isUnknownQuantity": false
}
```

**UpdateProductSuppliesRequest:**
```json
{
  "supplies": [
    { "supplyId": "...", "quantityRequired": 0.2, "isUnknownQuantity": false },
    { "supplyId": "...", "quantityRequired": 0.0, "isUnknownQuantity": true }
  ]
}
```

---

### Modificación al endpoint de confirmación de pedido

**Ubicación**: `StoreController` — endpoint que confirma un pedido (cambia status a confirmado).

**Lógica a agregar** (dentro de la misma transacción):
```
foreach item in order.Items:
  product = db.Products con ProductSupplies incluidos
  foreach ps in product.ProductSupplies donde !IsUnknownQuantity:
    supply = db.Supplies.Find(ps.SupplyId)
    delta = ps.QuantityRequired * item.Quantity
    supply.CurrentStock -= delta
    db.InventoryMovements.Add(new {
      SupplyId = ps.SupplyId,
      QuantityChange = -delta,
      Reason = "OrderDeducted",
      ReferenceId = orderId
    })
await db.SaveChangesAsync()
```

---

## Fase 4 — Frontend Admin

### Nueva página: `/admin/proveedores`
**Archivo**: `front/src/app/admin/proveedores/page.tsx`

UI:
- Header con botón "Añadir proveedor"
- Tabla: Nombre | Teléfono | Dirección | Deuda total | Acciones (editar/eliminar)
- Modal crear/editar con campos: nombre (obligatorio), teléfono, dirección, notas
- Confirmación antes de eliminar

**Funciones en admin-api.ts:**
```typescript
getSuppliers(): Promise<SupplierDto[]>
createSupplier(data: CreateSupplierRequest): Promise<SupplierDto>
updateSupplier(id: string, data: UpdateSupplierRequest): Promise<SupplierDto>
deleteSupplier(id: string): Promise<void>
```

---

### Nueva página: `/admin/insumos`
**Archivo**: `front/src/app/admin/insumos/page.tsx`

3 tabs:

**Tab "Insumos":**
- Tabla: Nombre | Unidad | Stock actual | Proveedor | Acciones
- Stock en rojo si < 5 (o algún threshold visual)
- Botón "Añadir insumo" → modal
- Por insumo: editar, eliminar, botón rojo "Vaciar stock"

**Tab "Compras":**
- Formulario: select insumo + select proveedor + cantidad + precio total
- Preview automático del precio por unidad (calculado en frontend mientras tipea)
- Tabla historial de compras: Insumo | Proveedor | Cantidad | Precio total | Precio/unidad | Fecha

**Tab "Movimientos":**
- Tabla: Insumo | Cambio | Motivo | Referencia | Fecha

**Funciones en admin-api.ts:**
```typescript
getSupplies(): Promise<SupplyDto[]>
createSupply(data: CreateSupplyRequest): Promise<SupplyDto>
updateSupply(id: string, data: UpdateSupplyRequest): Promise<SupplyDto>
deleteSupply(id: string): Promise<void>
resetSupplyStock(id: string): Promise<void>
getSupplyPurchases(): Promise<SupplyPurchaseDto[]>
createSupplyPurchase(data: CreateSupplyPurchaseRequest): Promise<SupplyPurchaseDto>
getSupplyMovements(id: string): Promise<InventoryMovementDto[]>
```

---

### Modificación: `/admin/menu` — Sección ingredientes en productos

**Archivo**: `front/src/app/admin/menu/page.tsx`

En el modal de crear/editar producto, agregar nueva sección "Ingredientes" (solo si `useIngredients` no es un producto sin sentido, siempre visible):
- Lista de insumos disponibles (cargados al abrir el modal)
- Multi-select con checkbox por insumo
- Por cada insumo seleccionado: input número para "Cantidad por unidad" + checkbox "Cantidad desconocida"
- Si "Cantidad desconocida" está marcado, el input se deshabilita

**Funciones en admin-api.ts:**
```typescript
getProductSupplies(productId: string): Promise<ProductSupplyDto[]>
updateProductSupplies(productId: string, data: UpdateProductSuppliesRequest): Promise<void>
```

---

## Navegación

Agregar links en el layout admin:
- "Proveedores" → `/admin/proveedores`
- "Insumos" → `/admin/insumos`

**Archivo**: `front/src/app/admin/layout.tsx` o el componente de navegación correspondiente.

---

## Tipos TypeScript (frontend)

```typescript
interface SupplierDto {
  id: string
  name: string
  phone?: string
  address?: string
  notes?: string
  totalDebt: number
  isActive: boolean
  createdAt: string
}

interface SupplyDto {
  id: string
  name: string
  unit?: string
  currentStock: number
  supplierId?: string
  supplierName?: string
  isActive: boolean
}

interface SupplyPurchaseDto {
  id: string
  supplyId: string
  supplyName: string
  supplierId?: string
  supplierName?: string
  quantityPurchased: number
  totalPrice: number
  pricePerUnit: number
  notes?: string
  purchaseDate: string
}

interface ProductSupplyDto {
  supplyId: string
  supplyName: string
  unit?: string
  quantityRequired: number
  isUnknownQuantity: boolean
}

interface InventoryMovementDto {
  id: string
  supplyId: string
  supplyName: string
  quantityChange: number
  reason: 'Purchase' | 'OrderDeducted' | 'ManualReset' | 'ManualAdjust'
  referenceId?: string
  createdAt: string
}
```

---

## Riesgos y decisiones

| Riesgo | Decisión |
|--------|----------|
| Stock negativo | Permitirlo — informativo, no bloqueante |
| Insumo eliminado con ProductSupply | Soft delete (IsActive = false) si tiene relaciones |
| Pedido falla tras descontar inventario | Transacción única (EF SaveChangesAsync es atómica) |
| Concurrencia en stock | Aceptable para MVP — actualizar con optimistic concurrency si aparece el problema |

---

## Orden de implementación

```
[BACKEND]
1. Entidades Domain (Supplier, Supply, SupplyPurchase, ProductSupply, InventoryMovement)
2. AppDbContext — registrar DbSets + relaciones + configuraciones
3. EF Migration + database update
4. DTOs en Application
5. SupplierController
6. SupplyController (incluye purchases y reset)
7. AdminController — endpoints de ProductSupply
8. StoreController — descuento automático en confirmación

[FRONTEND]  
9.  Types en types/store.ts o types/inventory.ts
10. Funciones en admin-api.ts
11. Página /admin/proveedores
12. Página /admin/insumos (3 tabs)
13. Modificación /admin/menu — sección ingredientes
14. Navegación admin — links nuevos
```
