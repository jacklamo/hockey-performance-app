---
phase: 06-ux-polish
plan: "01"
subsystem: frontend-components
tags: [header, skeleton, shimmer, loading, next-auth]
dependency_graph:
  requires: []
  provides:
    - app/components/Header.tsx — shared header with Logout button
    - .skeleton-shimmer CSS class in globals.css
  affects:
    - app/dashboard/page.tsx (plan 02 will import Header)
    - app/games/page.tsx (plan 02 will import Header)
    - app/games/[id]/page.tsx (plan 02 will import Header)
    - all loading.tsx files (plan 02 will use .skeleton-shimmer)
tech_stack:
  added: []
  patterns:
    - Shared layout component pattern (Header.tsx extracted for reuse)
    - CSS keyframe animation via globals.css (no JS animation library)
key_files:
  created:
    - app/components/Header.tsx
  modified:
    - app/globals.css
decisions:
  - "'use client' required on Header.tsx because onClick handler calls signOut"
  - "signOut always passes callbackUrl: '/auth/login' to prevent production redirect loop if NEXTAUTH_URL misconfigured"
  - "Plain text Logout button (not icon) — matches locked decision in research"
  - ".skeleton-shimmer as plain CSS class — no Tailwind config needed in Tailwind CSS 4"
metrics:
  duration_minutes: 5
  completed_date: "2026-07-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
requirements_satisfied:
  - UX-01
---

# Phase 6 Plan 01: Shared Header + Shimmer CSS Summary

**One-liner:** Shared Header component with signOut logout button + CSS shimmer keyframe animation for all skeleton loading screens.

## What Was Built

### app/components/Header.tsx (new)

A `'use client'` React component that provides a consistent page header across the application.

**Interface exported:**
```tsx
export default function Header({ title }: { title: string })
```

- Accepts a single `title: string` prop rendered as an h1 on the left
- Logout button (plain text) on the right calls `signOut({ callbackUrl: '/auth/login' })`
- Outer wrapper: `bg-white shadow-sm border-b border-gray-200`
- Inner div: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4`

### app/globals.css (modified)

Appended shimmer animation CSS at the bottom of the file (Tailwind CSS 4 content untouched):

- `@keyframes shimmer` — animates `background-position` from -200% to 200%
- `.skeleton-shimmer` — class applied to skeleton placeholder elements; uses a gray gradient with 1.5s linear infinite animation

**Class name confirmed:** `.skeleton-shimmer`

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create app/components/Header.tsx | d3b2e87 |
| 2 | Add shimmer keyframes to app/globals.css | dbf9b7d |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- app/components/Header.tsx exists: PASS
- callbackUrl '/auth/login' present: PASS
- .skeleton-shimmer in globals.css: PASS
- TypeScript noEmit: PASS (no errors)
- npm test: PASS (36 passed, 1 todo, 0 failures)

## Self-Check: PASSED
