# Admin Panel Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate horizontal scroll on the admin panel on mobile devices, and replace the cramped three-button category header with a `⋯` overflow menu on mobile.

**Architecture:** Two isolated file edits — Tailwind responsive class changes in `config/page.tsx` (business hours row) and a new `useState`-based dropdown in `menu/page.tsx` (category header). No new files, no shared state, no backend changes.

**Tech Stack:** Next.js 16.2.4, React 19, Tailwind CSS v4, TypeScript

---

## Files changed

| File | Change |
|------|--------|
| `front/src/app/store/[tenant]/admin/config/page.tsx` | Make business hours rows stack vertically on mobile |
| `front/src/app/store/[tenant]/admin/menu/page.tsx` | Add `⋯` overflow menu for category edit/delete on mobile |

---

## Task 1: Fix business hours overflow in `config/page.tsx`

**Files:**
- Modify: `front/src/app/store/[tenant]/admin/config/page.tsx` (hours section, lines ~298–333)

The hours section renders a `flex` row per day. On mobile, `<input type="time">` has a browser-enforced minimum width that overflows the page on narrow screens. Fix: stack label above time inputs on mobile (`flex-col`), side-by-side on `sm+` (`sm:flex-row`).

- [ ] **Step 1: Replace the hours row in `config/page.tsx`**

Find this block (the `hours.map` inside the Horarios card):

```tsx
<div className="space-y-2">
  {hours.map((h, i) => (
    <div key={h.dayOfWeek} className="flex items-center gap-3">
      <div className="w-24 flex-shrink-0">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={h.isOpen}
            onChange={(e) => updateHour(i, 'isOpen', e.target.checked)}
            className="w-4 h-4 accent-orange-600"
          />
          <span className="text-sm text-gray-700">{DAY_NAMES[h.dayOfWeek]}</span>
        </label>
      </div>

      {h.isOpen ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="time"
            value={h.opensAt ?? '09:00'}
            onChange={(e) => updateHour(i, 'opensAt', e.target.value)}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="time"
            value={h.closesAt ?? '22:00'}
            onChange={(e) => updateHour(i, 'closesAt', e.target.value)}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      ) : (
        <span className="text-sm text-gray-400 flex-1">Cerrado</span>
      )}
    </div>
  ))}
</div>
```

Replace with:

```tsx
<div className="space-y-2">
  {hours.map((h, i) => (
    <div key={h.dayOfWeek} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <div className="sm:w-24 sm:flex-shrink-0">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={h.isOpen}
            onChange={(e) => updateHour(i, 'isOpen', e.target.checked)}
            className="w-4 h-4 accent-orange-600"
          />
          <span className="text-sm text-gray-700">{DAY_NAMES[h.dayOfWeek]}</span>
        </label>
      </div>

      {h.isOpen ? (
        <div className="flex items-center gap-2 flex-1 ml-6 sm:ml-0">
          <input
            type="time"
            value={h.opensAt ?? '09:00'}
            onChange={(e) => updateHour(i, 'opensAt', e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-gray-400 text-sm flex-shrink-0">–</span>
          <input
            type="time"
            value={h.closesAt ?? '22:00'}
            onChange={(e) => updateHour(i, 'closesAt', e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      ) : (
        <span className="text-sm text-gray-400 ml-6 sm:ml-0">Cerrado</span>
      )}
    </div>
  ))}
</div>
```

Key diffs:
- Row: `flex items-center gap-3` → `flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3`
- Label div: `w-24 flex-shrink-0` → `sm:w-24 sm:flex-shrink-0`
- Time inputs wrapper: added `ml-6 sm:ml-0` (indents under checkbox on mobile)
- Each time input: added `min-w-0` (allows shrinking within flex)
- The `–` span: added `flex-shrink-0` (prevents dash from shrinking)
- "Cerrado" span: `flex-1` removed, `ml-6 sm:ml-0` added

- [ ] **Step 2: Verify lint passes**

```bash
cd front && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd front && git add src/app/store/\[tenant\]/admin/config/page.tsx
git commit -m "fix: make business hours rows responsive on mobile"
```

---

## Task 2: Add `⋯` overflow menu to category header in `menu/page.tsx`

**Files:**
- Modify: `front/src/app/store/[tenant]/admin/menu/page.tsx`

On desktop (`md+`): current three-button layout unchanged.  
On mobile (`< md`): "Editar" and "Eliminar" move into a dropdown triggered by a `⋯` button.

- [ ] **Step 1: Add `openMenuId` state and click-outside effect**

The component already has several `useState` calls at the top. Add these two right after the existing state declarations (after `uploading` state, before `load`):

```tsx
const [openMenuId, setOpenMenuId] = useState<string | null>(null)

useEffect(() => {
  if (!openMenuId) return
  const handler = () => setOpenMenuId(null)
  document.addEventListener('click', handler)
  return () => document.removeEventListener('click', handler)
}, [openMenuId])
```

`openMenuId` holds the `id` of the category whose dropdown is open, or `null` when all are closed. The `useEffect` attaches a one-time document click listener whenever a menu opens; it removes itself on cleanup or when the menu closes.

- [ ] **Step 2: Replace the category header JSX**

Find this block inside the `categories.map`:

```tsx
<div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
  <div className="flex items-center gap-2">
    <span className="text-xl">{cat.emoji}</span>
    <span className="font-semibold text-gray-800">{cat.name}</span>
    {!cat.isActive && (
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">inactiva</span>
    )}
  </div>
  <div className="flex items-center gap-2">
    <button
      onClick={() => openNewProd(cat.id)}
      className="text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition-colors"
    >
      + Producto
    </button>
    <button
      onClick={() => openEditCat(cat)}
      className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
    >
      Editar
    </button>
    <button
      onClick={() => removeCat(cat.id)}
      className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
    >
      Eliminar
    </button>
  </div>
</div>
```

Replace with:

```tsx
<div className="relative flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
  <div className="flex items-center gap-2 min-w-0 flex-1">
    <span className="text-xl flex-shrink-0">{cat.emoji}</span>
    <span className="font-semibold text-gray-800 truncate">{cat.name}</span>
    {!cat.isActive && (
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">inactiva</span>
    )}
  </div>

  {/* Desktop: all three buttons */}
  <div className="hidden md:flex items-center gap-2 flex-shrink-0">
    <button
      onClick={() => openNewProd(cat.id)}
      className="text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition-colors"
    >
      + Producto
    </button>
    <button
      onClick={() => openEditCat(cat)}
      className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
    >
      Editar
    </button>
    <button
      onClick={() => removeCat(cat.id)}
      className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
    >
      Eliminar
    </button>
  </div>

  {/* Mobile: + Producto + ⋯ menu */}
  <div className="flex md:hidden items-center gap-2 flex-shrink-0">
    <button
      onClick={() => openNewProd(cat.id)}
      className="text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition-colors"
    >
      + Producto
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation()
        setOpenMenuId(openMenuId === cat.id ? null : cat.id)
      }}
      className="text-sm px-2 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-bold leading-none"
    >
      ⋯
    </button>
  </div>

  {/* Dropdown */}
  {openMenuId === cat.id && (
    <div className="absolute right-4 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
      <button
        onClick={() => { openEditCat(cat); setOpenMenuId(null) }}
        className="w-full text-left text-sm px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Editar
      </button>
      <button
        onClick={() => { removeCat(cat.id); setOpenMenuId(null) }}
        className="w-full text-left text-sm px-4 py-2 text-red-500 hover:bg-red-50 transition-colors"
      >
        Eliminar
      </button>
    </div>
  )}
</div>
```

Key points:
- `relative` on the header enables `absolute` positioning of the dropdown
- Left div: `min-w-0 flex-1` lets it shrink; name span gets `truncate`; badge gets `flex-shrink-0`
- `hidden md:flex` shows desktop buttons only on md+
- `flex md:hidden` shows mobile buttons only below md
- `e.stopPropagation()` on `⋯` prevents the document click handler from immediately closing the dropdown on the same click
- Dropdown uses `top-full mt-1` to appear just below the header row

- [ ] **Step 3: Verify lint passes**

```bash
cd front && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd front && git add src/app/store/\[tenant\]/admin/menu/page.tsx
git commit -m "feat: add mobile overflow menu to category header in admin panel"
```

---

## Task 3: Build verification + manual test checklist

- [ ] **Step 1: Run production build**

```bash
cd front && npm run build
```

Expected: build completes with no errors (warnings about `<img>` are pre-existing and acceptable).

- [ ] **Step 2: Start dev server**

```bash
cd front && npm run dev
```

Open `http://localhost:3000` (or the tenant URL used in dev).

- [ ] **Step 3: Manual test — business hours (Config page)**

Open browser DevTools → toggle device toolbar → set width to 375px (iPhone SE).

Navigate to Config → Horarios section. Verify:
- [ ] Each day row shows the checkbox + day name on line 1, time inputs on line 2 (indented)
- [ ] No horizontal scrollbar appears on the page
- [ ] On a day set to "Cerrado", the text "Cerrado" appears below the day name (indented)
- [ ] Resize to 640px+ (sm breakpoint) — rows return to single-line layout

- [ ] **Step 4: Manual test — category overflow menu (Menu page)**

With DevTools still at 375px, navigate to Carta.

- [ ] Category header shows `+ Producto` and `⋯` buttons (no Editar/Eliminar)
- [ ] Tapping `⋯` opens a dropdown with "Editar" and "Eliminar"
- [ ] Tapping "Editar" opens the edit modal and closes the dropdown
- [ ] Tapping "Eliminar" triggers the confirm dialog and closes the dropdown
- [ ] Tapping anywhere else on the page closes the dropdown
- [ ] Resize to 768px+ (md breakpoint) — `⋯` button disappears, full three-button layout appears

- [ ] **Step 5: Final commit if build/tests passed**

If no issues found:

```bash
cd front && git add -p  # confirm nothing unintended staged
git log --oneline -4    # confirm the two feature commits are present
```

No additional commit needed — Tasks 1 and 2 each committed their own changes.
