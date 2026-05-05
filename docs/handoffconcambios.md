# Handoff con cambios — Proveedores, Insumos e Inventario

**Fecha:** 2026-05-05  
**Branch:** `fix/email-and-subscription-expiry`

---

## ✅ Lo que se implementó (completo)

### Backend

**Nuevas entidades (`MorfApp.Domain/Entities/`):**
- `Supplier.cs` — Id, TenantId, Name, Phone?, Address?, Notes?, TotalDebt (decimal), IsActive, CreatedAt, UpdatedAt
- `Supply.cs` — Id, TenantId, Name, Unit?, CurrentStock (decimal), SupplierId?, IsActive, CreatedAt, UpdatedAt
- `SupplyPurchase.cs` — Id, TenantId, SupplyId, SupplierId?, QuantityPurchased, TotalPrice, PricePerUnit, PurchaseDate, Notes?, CreatedAt
- `ProductSupply.cs` — Id, TenantId, ProductId, SupplyId, QuantityRequired, IsUnknownQuantity
- `InventoryMovement.cs` — Id, TenantId, SupplyId, QuantityChange, Reason (string), ReferenceId?, CreatedAt

**Nuevos DTOs (`MorfApp.Application/DTOs/Admin/`):**
- `SupplierDto.cs` — SupplierDto, CreateSupplierRequest, UpdateSupplierRequest
- `SupplyDto.cs` — SupplyDto, CreateSupplyRequest, UpdateSupplyRequest
- `SupplyPurchaseDto.cs` — SupplyPurchaseDto, CreateSupplyPurchaseRequest
- `ProductSupplyDto.cs` — ProductSupplyDto, UpdateProductSuppliesRequest, ProductSupplyItem
- `InventoryMovementDto.cs` — InventoryMovementDto

**Nuevos controllers (`MorfApp.Api/Controllers/`):**
- `SupplierController.cs` — GET/POST/PUT/DELETE `/api/admin/suppliers`
- `SupplyController.cs` — GET/POST/PUT/DELETE `/api/admin/supplies`, POST reset, GET/POST purchases, GET movements

**Modificaciones a controllers existentes:**
- `AdminController.cs` — Agregados GET + PUT `/api/admin/products/{id}/supplies`
- `OrdersController.cs` — `POST /{id}/confirm` ahora descuenta inventario automáticamente

**Migration:** `20260505161547_AddSuppliersAndInventory.cs` (crea 5 tablas nuevas)

**Nota importante:** `Program.cs` tiene `MigrateAsync()` → la migración se aplica automáticamente al arrancar.

---

### Frontend

**Tipos agregados a `front/src/types/store.ts`:**
- `SupplierDto`, `SupplyDto`, `SupplyPurchaseDto`, `ProductSupplyDto`, `InventoryMovementDto`

**Funciones agregadas a `front/src/lib/admin-api.ts`:**
- Proveedores: `getSuppliers`, `createSupplier`, `updateSupplier`, `deleteSupplier`
- Insumos: `getSupplies`, `createSupply`, `updateSupply`, `deleteSupply`, `resetSupplyStock`
- Compras: `getSupplyPurchases`, `createSupplyPurchase`
- Movimientos: `getSupplyMovements`
- Ingredientes: `getProductSupplies`, `updateProductSupplies`

**Páginas nuevas:**
- `front/src/app/admin/proveedores/page.tsx` — CRUD proveedores, deuda en rojo si > 0
- `front/src/app/admin/insumos/page.tsx` — 3 tabs: Insumos / Compras / Movimientos

**Páginas modificadas:**
- `front/src/app/admin/menu/page.tsx` — Sección "Ingredientes" agregada al modal de producto, con multi-select de insumos, input cantidad, checkbox "Cantidad desconocida"
- `front/src/app/admin/layout.tsx` — Links 🏭 Proveedores y 📦 Insumos agregados a navegación

---

## 🔴 Problemas detectados (a resolver)

### 1. Error 500 en endpoints existentes

**Síntomas:**
- Al entrar a **Promociones** → API error 500
- Al entrar a **Apariencia**, **WhatsApp** y **Configuración** → error al cargar datos

**Causa probable:**  
No se identificó con certeza antes de cortar la sesión. Se descartó:
- Error de compilación (el servidor arranca)
- La migración en sí (no modifica tablas existentes, solo crea tablas nuevas)

**Lo que se investigó:**
- `Program.cs` tiene `await db.Database.MigrateAsync()` en startup → la migración nueva se aplica automáticamente
- `AdminController.cs` — código de promotions, apariencia, config y whatsapp se leyó y se ve correcto
- `AppDbContext.cs` — `OnModelCreating` se leyó completo, no hay errores aparentes
- Las páginas de apariencia/config/whatsapp llaman a `GET /api/admin/me` (`getAdminMe`)
- `MapTenantInfo` en AdminController se ve correcto

**Próximos pasos para debuggear:**
1. Levantar el back localmente (`cd back && dotnet run --project MorfApp.Api`)
2. Abrir `http://localhost:5500/swagger`
3. Autenticarse y ejecutar `GET /api/admin/me` manualmente
4. Ver el error exacto en la consola del servidor (no solo el 500 del cliente)
5. Revisar si la migración se aplicó con éxito o si hay un error en startup

---

## 🟡 Cambios pendientes a implementar

### 2. Detalle de deuda por proveedor

**Qué se quiere:**  
En la página `/admin/proveedores`, agregar un botón por proveedor para ver el detalle de la deuda: qué compras generaron esa deuda, cuánto se debe por cada una.

**Cómo implementarlo:**

**Backend — nuevo endpoint:**
```
GET /api/admin/suppliers/{id}/debt-detail
```
Retorna lista de `SupplyPurchase` de ese proveedor que contribuyeron a la deuda, junto con los pagos registrados. Necesita una nueva entidad `SupplierPayment` (ver punto 3).

**Frontend:**
- Botón "Ver deuda" (o ícono de ojo) por fila en la tabla de proveedores
- Modal que abre un detalle con: lista de compras pendientes (fecha, insumo, monto) y total adeudado

---

### 3. Registrar pago de deuda (total o parcial)

**Qué se quiere:**  
En el modal de detalle de deuda, 2 botones:
- **"Pagar todo"** → salda toda la deuda del proveedor (TotalDebt = 0)
- **"Pago parcial"** → ingresa un monto y lo descuenta de TotalDebt

**Nueva entidad necesaria — `SupplierPayment`:**
```csharp
string Id
string TenantId
string SupplierId     // FK Supplier
decimal Amount        // monto pagado
string? Notes         // ej: "Transferencia 12/05"
DateTime PaidAt       // default UtcNow
DateTime CreatedAt
```

**Nuevos endpoints en SupplierController:**
```
POST /api/admin/suppliers/{id}/pay-full     → TotalDebt = 0, crea SupplierPayment
POST /api/admin/suppliers/{id}/pay-partial  → body: { amount, notes? } → TotalDebt -= amount, crea SupplierPayment
GET  /api/admin/suppliers/{id}/payments     → historial de pagos
```

**DTOs nuevos:**
```csharp
// CreatePartialPaymentRequest
decimal Amount      // required, > 0
string? Notes

// SupplierPaymentDto
string Id
string SupplierId
string SupplierName
decimal Amount
string? Notes
DateTime PaidAt
```

**Frontend:**
- Modal "Detalle de deuda" con:
  - Lista de compras del proveedor (de `SupplyPurchase`)
  - Historial de pagos
  - Total adeudado actual
  - Botón rojo "Pagar todo" (con confirmación)
  - Botón "Pago parcial" → abre sub-modal con input de monto y notas
- Recargar proveedor después de registrar pago para actualizar la deuda

**Nueva migration necesaria:**  
`dotnet ef migrations add AddSupplierPayments --project MorfApp.Infrastructure --startup-project MorfApp.Api`

---

### 4. Eliminar textbox de unidad en Insumos (solo mantener dropdown)

**Qué se quiere:**  
En la página `/admin/insumos`, el modal de crear/editar insumo tiene actualmente un dropdown + un textbox para la unidad. Solo mantener el dropdown (opciones: kg, g, litros, ml, unidades, porciones, y una opción "Otro" si se quiere permitir valor libre, o simplemente sin campo libre).

**Archivo a modificar:** `front/src/app/admin/insumos/page.tsx`

**Buscar el formulario de insumo** (alrededor de donde está `UNIT_OPTIONS`) y eliminar el `<input type="text">` de unidad, dejando solo el `<select>` con las opciones predefinidas.

Si se quiere permitir "otro" valor personalizado, se puede agregar la opción `"otro"` al select y mostrar un input solo cuando esa opción está seleccionada.

---

## Orden sugerido para la próxima sesión

```
1. Debuggear los 500 (ver logs del servidor en consola)
2. Fix los 500 si se encuentra la causa
3. Eliminar textbox unidad en insumos (cambio simple, 5 min)
4. Implementar SupplierPayment (entidad + migration + endpoints)
5. Frontend: modal detalle deuda + botones de pago
```
