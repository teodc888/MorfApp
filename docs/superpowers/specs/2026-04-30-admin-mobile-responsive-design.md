# Admin Panel Mobile Responsiveness

**Date:** 2026-04-30  
**Scope:** `front/src/app/store/[tenant]/admin/`

## Problem

Two distinct issues cause a poor mobile experience:

1. **Horizontal page scroll** — `config/page.tsx` business hours rows contain `<input type="time">` elements inside a `flex` row with no overflow containment. Time inputs have a browser-enforced minimum width (especially on iOS Safari) that exceeds available space on narrow screens, overflowing all the way to the page body.

2. **Category header cramping** — `menu/page.tsx` category rows show three action buttons ("+ Producto", "Editar", "Eliminar") in a single flex row. On mobile the category name gets crushed against the buttons; the parent's `overflow-hidden` clips the result.

No other pages cause page-level overflow. The sidebar/bottom-nav layout in `layout.tsx` is already mobile-aware (`hidden md:flex` sidebar, `md:hidden` bottom tabs).

## Change 1 — `config/page.tsx`: business hours row

### Before
```
| ☑ Miércoles | [09:00] – [22:00] |   ← single flex row, overflows on <375px
```

### After
```
Mobile (< sm):        Desktop (sm+):
  ☑ Miércoles           ☑ Miércoles  [09:00] – [22:00]
    [09:00] – [22:00]
```

### Implementation
- Row container: `flex items-center gap-3` → `flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3`
- Day label div: `w-24 flex-shrink-0` → `sm:w-24 sm:flex-shrink-0`
- Time inputs wrapper: add `ml-6 sm:ml-0` (indents under checkbox on mobile)
- Each `<input type="time">`: add `min-w-0` to allow shrinking within flex
- "Cerrado" span: add `ml-6 sm:ml-0`

No desktop visual change.

## Change 2 — `menu/page.tsx`: category header overflow menu

### Before (all screen sizes)
```
| 🍔 Hamburguesas | [+ Producto] [Editar] [Eliminar] |
```

### After
```
Mobile (< md):                    Desktop (md+, unchanged):
| 🍔 Hambur… | [+ Producto] [⋯] |  | 🍔 Hamburguesas | [+ Producto] [Editar] [Eliminar] |
                      ↓ tap ⋯
              ┌──────────────┐
              │  ✏ Editar   │
              │  🗑 Eliminar │
              └──────────────┘
```

### Implementation

**State:**
```ts
const [openMenuId, setOpenMenuId] = useState<string | null>(null)
```
One piece of state tracks which category's overflow menu is open. `null` = all closed.

**Close-on-outside-click:**
```ts
useEffect(() => {
  if (!openMenuId) return
  const handler = () => setOpenMenuId(null)
  document.addEventListener('click', handler)
  return () => document.removeEventListener('click', handler)
}, [openMenuId])
```

**Category header layout:**
- Wrap in `relative` for dropdown positioning
- Left div: add `min-w-0 flex-1`; name span: add `truncate`
- Right div mobile (`md:hidden`): `[+ Producto]` + `[⋯]` button
- Right div desktop (`hidden md:flex`): current three buttons, unchanged

**Dropdown:**
```tsx
{openMenuId === cat.id && (
  <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
    <button onClick={() => { openEditCat(cat); setOpenMenuId(null) }}>
      Editar
    </button>
    <button onClick={() => { removeCat(cat.id); setOpenMenuId(null) }}>
      Eliminar
    </button>
  </div>
)}
```

The `⋯` button calls `e.stopPropagation()` before toggling to prevent the document click handler from immediately closing the menu.

## Files changed

| File | Change |
|------|--------|
| `front/src/app/store/[tenant]/admin/config/page.tsx` | Business hours row responsive layout |
| `front/src/app/store/[tenant]/admin/menu/page.tsx` | Category header responsive + overflow menu |

## Out of scope

- `branding/page.tsx` `grid-cols-2` color pickers — fits on 375px+, acceptable as-is
- `modifiers/page.tsx` options row — fixed widths sum to ~172px, leaves adequate room for name input
- `whatsapp/page.tsx` — already uses `grid-cols-1 lg:grid-cols-2`; preview has `overflow-auto`
- No backend changes
