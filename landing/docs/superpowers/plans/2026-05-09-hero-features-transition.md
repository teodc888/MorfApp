# Hero Features Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abrupt hero-to-features separator with a premium cinematic dissolve that preserves the current 3D hero and palette.

**Architecture:** Add one focused presentational component for the transition and wire it into the landing page in place of the inline spacer. Adjust the Features section top background and spacing so the transition and section read as one continuous surface.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, CSS gradients.

---

### Task 1: Add Transition Component

**Files:**
- Create: `src/components/landing/HeroToFeaturesTransition.tsx`

- [ ] **Step 1: Create a presentational component**

Use a plain React component with layered absolutely positioned divs. Keep all visuals local to the component.

- [ ] **Step 2: Include responsive sizing and reduced motion safety**

Use static CSS animation only for subtle sheen and disable it under `prefers-reduced-motion`.

### Task 2: Wire Component Into Landing

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Import `HeroToFeaturesTransition`**

Add the import next to existing landing components.

- [ ] **Step 2: Replace the inline `140px` spacer**

Remove the inline style spacer and render `<HeroToFeaturesTransition />`.

### Task 3: Tune Features Handoff

**Files:**
- Modify: `src/components/landing/Features.tsx`

- [ ] **Step 1: Remove the current top gray-to-cream background**

Replace it with a cream background that starts cleanly after the transition.

- [ ] **Step 2: Reduce visual friction at the top**

Use top padding that lets the heading breathe without looking detached from the transition.

### Task 4: Verify

**Files:**
- Existing project files only

- [ ] **Step 1: Run TypeScript check**

Run: `npm.cmd run lint`

- [ ] **Step 2: Inspect local browser**

The user has `localhost:3000` running. Confirm visually through their feedback or browser inspection that the handoff no longer appears as a hard block.
