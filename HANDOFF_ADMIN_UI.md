# Handoff: Admin UI — Continuación del rediseño

## Estado actual

### ✅ Completado
- `front/src/app/layout.tsx` — fonts cargados vía `<link>` en `<head>` (Material Symbols, Noto Serif, Plus Jakarta Sans)
- `front/src/app/globals.css` — tokens CSS y clases de diseño (`.card`, `.chip`, `.btn`, `.field`, `.input`, `.select`, `.seg`, `.modal-backdrop`, `.modal-sheet`, `.drawer`, `.admin-toast`)
- `front/src/app/admin/orders/page.tsx` — Pedidos ✅
- `front/src/app/admin/metrics/page.tsx` — Métricas ✅
- `front/src/app/admin/menu/page.tsx` — Carta ✅

### ❌ Pendiente (en orden)
1. `front/src/app/admin/modifiers/page.tsx` — Opciones
2. `front/src/app/admin/promotions/page.tsx` — Promos
3. `front/src/app/admin/proveedores/page.tsx` — Proveedores
4. `front/src/app/admin/insumos/page.tsx` — Insumos
5. `front/src/app/admin/branding/page.tsx` — Apariencia
6. `front/src/app/admin/whatsapp/page.tsx` — WhatsApp
7. `front/src/app/admin/config/page.tsx` — Configuración

---

## Regla de oro para cada página

**No tocar la lógica de datos.** Solo reescribir el JSX del render. Cada página ya tiene:
- Estado local con `useState`
- Llamadas a API con `admin-api.ts`
- Mutaciones y manejo de errores

Solo reemplazar clases Tailwind (`className="px-4 py-2 bg-orange-600..."`) con las clases del sistema de diseño.

---

## Sistema de diseño (ya en globals.css)

### Clases CSS disponibles

```
.card          → fondo blanco, radius 12px, shadow
.chip          → pill pequeño muted | .chip.error | .chip.success | .chip.warning | .chip.primary
.btn           → base botón | .btn-primary | .btn-outline | .btn-ghost | .btn-danger | .btn-block | .btn-sm
.field         → wrapper label+input (flex-col gap-6px)
.input         → input estilizado (fondo surface-container, focus naranja)
.select        → select estilizado (igual que .input)
.seg           → segmented control container | .seg button.active → fondo naranja
.tap           → feedback táctil en botones/rows
.mat           → ícono Material Symbols | .mat.fill | .mat.sm | .mat.xs | .mat.lg
.serif         → fuente Noto Serif
.divider       → línea horizontal 1px outline-soft
.modal-backdrop → overlay oscuro con blur, flex items-end
.modal-sheet   → bottom sheet blanco, radius-top 20px, slide-up
.modal-sheet .grabber → handle gris centrado
.drawer-backdrop → overlay lateral
.drawer        → panel lateral izquierdo 78%/320px max
.admin-toast   → toast top-center pill oscuro
.bar-track / .bar-fill → barra de progreso
```

### Tokens CSS
```css
--primary: #F97316       /* naranja marca */
--primary-dark: #9D4300  /* headings, numerales grandes */
--on-primary: #FFFFFF
--bg: #FAF9F6            /* fondo página */
--surface: #FFFFFF       /* cards */
--surface-container: #F0EEF8
--surface-container-high: #E8E7F1
--text: #1A1B22
--muted: #584237
--muted-soft: #8a7468
--outline: #E0C0B1
--outline-soft: #EFE0D6
--error / --error-bg: #BA1A1A / #FFDAD6
--success / --success-bg: #2E7D32 / #E8F5E9
--warning / --warning-bg: #E65100 / #FFF3E0
--radius-card: 12px | --radius-modal: 20px | --radius-pill: 999px
--shadow-card | --shadow-elev | --shadow-soft
--serif | --sans
```

---

## Patrón de cada página (copiar siempre)

```tsx
<div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)' }}>

  {/* Page header */}
  <div style={{ padding: '4px 22px 18px' }}>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
      KICKER
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', flex: 1, fontWeight: 700 }}>
        Título
      </h1>
      {/* botón opcional top-right */}
      <button className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>
        <span className="mat sm">add</span> Acción
      </button>
    </div>
    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
      Subtítulo descriptivo.
    </p>
  </div>

  {/* Contenido */}
  <div style={{ padding: '0 22px 24px' }}>
    ...
  </div>

  {/* Bottom sheet (para modals) */}
  {open && (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="grabber" />
        <h2 className="serif" style={{ margin: '0 0 16px', fontSize: 22, color: 'var(--primary-dark)' }}>Título</h2>
        {/* contenido */}
      </div>
    </div>
  )}
</div>
```

---

## Referencia de diseño

Los archivos de referencia están en:
`C:\Users\msi\Downloads\MorfappDesign1\design_handoff_morfapp_admin\`

| Archivo | Pantalla |
|---|---|
| `opciones.jsx` | Modificadores |
| `promos.jsx` | Promos |
| `proveedores.jsx` | Proveedores |
| `insumos.jsx` | Insumos |
| `apariencia.jsx` | Apariencia/Branding |
| `whatsapp.jsx` | WhatsApp |
| `config.jsx` | Configuración |
| `styles.css` | Todos los tokens |
| `README.md` | Descripción detallada de cada pantalla |

**Antes de implementar cada pantalla: leer el .jsx correspondiente.**

---

## Convenciones importantes

- **Íconos**: `<span className="mat">nombre_icono</span>` — nombres con guiones bajos son nombres de Material Symbols (receipt_long, bar_chart, etc.), NO texto plano
- **Fuente serif**: `<div className="serif">` o `className="serif"` en spans para headings y números grandes
- **Precio argentino**: `formatPrice()` de `@/lib/utils` — ya formatea con $ y separadores
- **Chips**: siempre usar `.chip` + modificador de color (`.chip.error`, `.chip.success`, `.chip.warning`, `.chip.primary`)
- **Cards**: siempre `<div className="card">` — nunca inline styles para shadow/radius/bg
- **Modals**: siempre `.modal-backdrop` + `.modal-sheet` — nunca `fixed inset-0 z-50 flex...` tailwind puro
- **Formularios**: siempre `.field` > `<label>` + `.input` o `.select` — nunca clases Tailwind para forms
- **Botones**: siempre `.btn .btn-*` — nunca `px-4 py-2 bg-orange-600...` tailwind puro
- **NO crear** archivos nuevos — solo editar los existentes en `front/src/app/admin/`
- **NO tocar** `layout.tsx` del admin (sidebar/nav ya están bien)
- **NO tocar** `globals.css` — las clases ya existen

---

## API calls disponibles (admin-api.ts)

Para cada pantalla, las funciones ya existen en `@/lib/admin-api`. Buscar con grep antes de implementar:
```
grep -n "export async function\|export function\|export type" front/src/lib/admin-api.ts
```

---

## Dev server
Ya corriendo en `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- Cada pantalla: `/admin/modifiers`, `/admin/promotions`, etc.
