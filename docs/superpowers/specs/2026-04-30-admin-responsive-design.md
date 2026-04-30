# Admin Responsive Design

## Objective

Make the admin area fully responsive so it works without horizontal scrolling on mobile, tablet, and desktop.

## Scope

Applies to:

- `front/src/app/store/[tenant]/admin/layout.tsx`
- `front/src/app/store/[tenant]/admin/menu/page.tsx`
- `front/src/app/store/[tenant]/admin/modifiers/page.tsx`
- `front/src/app/store/[tenant]/admin/branding/page.tsx`
- `front/src/app/store/[tenant]/admin/config/page.tsx`
- `front/src/app/store/[tenant]/admin/whatsapp/page.tsx`

Out of scope:

- Business logic changes
- API changes
- Visual redesign unrelated to responsive behavior

## Problem Summary

The current admin UI is desktop-biased. On smaller screens several components exceed the viewport width and force left-right scrolling. The main causes are:

- action rows that assume enough horizontal space
- fixed-width controls inside narrow containers
- two-column form grids that do not collapse early enough
- modal layouts with limited vertical constraints and cramped spacing
- preview and editor sections that compete for width instead of stacking cleanly

## Approach Options

### Option 1: Patch each overflow case independently

Fastest path, but it leaves repeated ad hoc responsive rules and increases regression risk.

### Option 2: Apply a consistent responsive pattern across the admin

Update shared layout constraints and align each page to the same mobile-first rules. This fixes the current issues and leaves a clearer pattern for future admin screens.

Recommended.

### Option 3: Rework the admin navigation and information architecture

Would allow a deeper UX improvement, but it is unnecessary for the current problem and adds avoidable scope.

## Approved Design

### Layout

- Keep the current desktop sidebar and mobile bottom navigation.
- Ensure the admin shell does not introduce horizontal overflow.
- Keep the main content width constrained, with mobile-first padding and enough bottom padding to clear the mobile tab bar.

### Lists and cards

- Any row that currently places content and actions on one line must wrap or stack on small screens.
- Product rows and modifier group rows should switch to a vertical or wrapped action layout on mobile.
- Text containers must use `min-w-0` and truncation only where it prevents overflow rather than hiding core information.

### Forms

- Two-column grids must collapse to one column on mobile and only expand at `sm` or `md`.
- Narrow fixed-width inputs should use full width on mobile where needed.
- Action buttons should stack when horizontal space is tight.

### Modals

- Use a mobile sheet-style presentation with safe viewport height limits.
- Add internal scrolling to modal content instead of allowing the whole modal to overflow the viewport.
- Keep footer actions easy to reach and wide enough for thumb use on mobile.

### Page-specific expectations

- `menu`: category headers, product rows, and product/category modals must fit cleanly on narrow screens.
- `modifiers`: group cards and option rows must avoid side-scroll; modal inputs must stack safely.
- `branding`: color controls and preview block must collapse without clipping.
- `config`: delivery controls, hour rows, and save actions must stack cleanly.
- `whatsapp`: editor and preview must remain readable with clean stacking and contained preview overflow.

## Data Flow and Logic Impact

No data flow or API behavior changes are required. The work is limited to layout and presentation classes, plus any minimal structural markup changes needed to support responsive wrapping.

## Error Handling

Existing save/load/error behavior remains unchanged. Responsive work must not alter validation or request handling.

## Testing

Manual verification should cover:

- mobile width around 320px to 430px
- tablet width around 768px
- desktop width 1024px and above
- all admin pages in scope
- open/close and scroll behavior of admin modals on mobile
- confirmation that no page requires horizontal scrolling

## Risks

- Over-aggressive stacking can make desktop layouts feel looser if breakpoints are applied too broadly.
- Truncation can hide useful labels if used as a substitute for proper wrapping.
- Modal height changes can affect keyboard usability on mobile if viewport constraints are not handled carefully.

## Implementation Notes

- Prefer mobile-first Tailwind class changes.
- Reuse a consistent pattern for wrapped action bars and responsive grids.
- Keep changes localized to the admin UI files in scope.
