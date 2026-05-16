# Hero To Features Transition Design

## Goal

Improve the transition between the 3D hero and the Features section so the page feels premium, cinematic, and visually unified without changing the current color palette or the 3D product sequence.

## Direction

Use a cinematic dissolve between the dark hero and the cream Features section. The transition should feel like the 3D scene is handing off into the product explanation, not like a flat separator block.

## Scope

- Replace the current fixed gradient spacer after `BurgerScroll`.
- Add a focused `HeroToFeaturesTransition` component.
- Keep the existing hero, 3D frame loading, pricing, testimonial, CTA, and footer behavior unchanged.
- Keep the existing color family: dark brown, cream, copper, and subtle amber.
- Adjust the Features section top treatment so it visually emerges from the transition.

## Visual Requirements

- Responsive height: taller on desktop, shorter on mobile.
- Layered gradients from `#2a1f1a` and `#3d332c` into `#f6f0e8`.
- Soft warm radial light near the lower center.
- Subtle grain texture and fine horizontal sheen lines.
- Organic curved edge using CSS clipping or pseudo-elements.
- No decorative orbs, unrelated imagery, or new palette direction.

## Verification

- Run TypeScript check with `npm.cmd run lint`.
- Review locally at `localhost:3000`, especially the hero-to-features handoff on desktop and mobile widths.
