---
phase: 02-game-management-mobile-polish
plan: "03"
subsystem: ui
tags: [react, nextjs, dashboard, mental-state, mobile]

requires:
  - phase: 02-game-management-mobile-polish
    provides: Mental state logging route at /games/[id]/mental

provides:
  - Conditional "Log check-in" nudge links on desktop Recent Games table rows
  - Conditional "Log mental check-in" nudge on mobile game cards
  - stopPropagation pattern separating nudge click from row/card navigation

affects:
  - dashboard discovery
  - mental state data coverage

tech-stack:
  added: []
  patterns:
    - "stopPropagation on nested link inside clickable row — desktop table"
    - "onClick + router.push inside outer Link to avoid nested Link — mobile card"

key-files:
  created: []
  modified:
    - app/dashboard/page.tsx

key-decisions:
  - "Mobile nudge uses onClick+router.push (not nested Link) because mobile card is already a <Link> component — nested Link is invalid HTML"
  - "Desktop nudge uses <Link> with e.stopPropagation() so row onClick still navigates to game detail when clicking outside the nudge cell"

patterns-established:
  - "stopPropagation on inline Link inside a clickable <tr> to isolate cell-level navigation"
  - "e.preventDefault() + e.stopPropagation() + router.push() inside a child div of <Link> for alternative navigation target"

requirements-completed:
  - MENTAL-01
  - MENTAL-03

duration: 5min
completed: 2026-03-10
---

# Phase 2 Plan 03: Mental State Nudge on Dashboard Summary

**Conditional "Log check-in" nudge links added to desktop table and mobile cards — closing the discovery gap for games missing mental state data**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T18:25:00Z
- **Completed:** 2026-03-10T18:30:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Desktop Recent Games table now has a "Check-In" sixth column — games missing mentalState show a "Log check-in" link; games with mental state logged show an empty cell
- Mobile game cards now show "Log mental check-in →" below the stats row for games missing mentalState
- Row/card click navigation to /games/[id] is unaffected — nudge click navigates independently to /games/[id]/mental
- TypeScript compiles clean — no new imports required

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mental state nudge to dashboard game rows and cards** - `a09b0b8` (feat)

## Files Created/Modified

- `app/dashboard/page.tsx` - Added Check-In table column header, desktop nudge td, and mobile nudge div with correct stopPropagation patterns

## Decisions Made

- Used nested `<Link>` with `e.stopPropagation()` for desktop nudge so the table row's `onClick` handler (which navigates to the game detail) is suppressed only for the nudge column click — all other cells still navigate to /games/[id]
- Used `onClick + router.push` instead of a nested `<Link>` for the mobile nudge because the entire mobile card is already a `<Link>` component; nesting a `<Link>` inside a `<Link>` produces invalid HTML and causes navigation issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Mental state nudge discovery mechanism is complete — players can now reach /games/[id]/mental directly from the dashboard for any game missing a check-in
- MENTAL-01 and MENTAL-03 requirements are satisfied
- Dashboard data pipeline already included mentalState per game from the API — this was a pure conditional JSX change

---
*Phase: 02-game-management-mobile-polish*
*Completed: 2026-03-10*
