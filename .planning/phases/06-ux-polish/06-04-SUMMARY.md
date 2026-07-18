---
phase: 06-ux-polish
plan: "04"
subsystem: ui
tags: [react, nextjs, header, loading-states, skeleton, lucide-react]

requires:
  - phase: 06-ux-polish/06-01
    provides: Header.tsx shared component with title prop and Logout button

provides:
  - Dashboard page with shared Header wired; inline error state; skeleton loading; retry-safe fetchGames
  - Game detail page with shared Header in all states; key={gameId} remount; Loader2 delete button

affects:
  - 06-05

tech-stack:
  added: []
  patterns:
    - "Error state rendered inline inside layout (not full-screen) so Header and Logout remain visible"
    - "isLoading skeleton branches match page structure for zero-layout-shift experience"
    - "key={gameId} on root div forces Suspense remount on same-segment navigation"
    - "setIsLoading(true) + setError('') at fetchGames start enables retry to re-show skeleton"

key-files:
  created: []
  modified:
    - app/dashboard/page.tsx
    - app/games/[id]/page.tsx

key-decisions:
  - "Error state moved inline (not full-screen early return) so Header + Logout always accessible during errors"
  - "key={gameId} uses existing gameId state variable set by useEffect — no React.use() migration needed"

patterns-established:
  - "All page error/loading branches render Header first, then content — Logout never hidden"
  - "Skeleton layout mirrors actual page structure (stat cards grid + table rows)"

requirements-completed:
  - UX-01
  - UX-02
  - UX-03
  - UX-04
  - UX-05

duration: 12min
completed: 2026-07-18
---

# Phase 06 Plan 04: Dashboard and Game Detail Header Wiring Summary

**Shared Header wired into dashboard and game detail with skeleton loading states, inline error handling, same-segment remount key, and Loader2 delete spinner**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-18T00:00:00Z
- **Completed:** 2026-07-18T00:12:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Dashboard now renders `<Header title="Performance Dashboard" />` with Logout button visible in all states (loading, error, content)
- Dashboard error state restructured from full-screen early return to inline card — Logout accessible during errors (fixes Pitfall 4)
- Dashboard isLoading branch shows stat-card + table-row skeleton instead of "Loading..." text — consistent with dashboard/loading.tsx
- fetchGames now calls `setIsLoading(true)` and `setError('')` at the start so "Try Again" re-triggers the skeleton
- Game detail page has `key={gameId}` on root div — forces Suspense remount on same-segment navigation (/games/1 → /games/2)
- Game detail shows `<Header title="Game Detail" />` in loading, error, and content states
- Delete Confirm button shows `<Loader2 className="w-4 h-4 animate-spin inline mr-2" />` + "Deleting..." while isDeleting=true

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Header and fix lifecycle states in dashboard/page.tsx** - `e8a6dad` (feat)
2. **Task 2: Wire Header, key prop, and delete Loader2 in games/[id]/page.tsx** - `54bfc75` (feat)

## Files Created/Modified
- `app/dashboard/page.tsx` - Added Header import + AlertCircle; restructured isLoading skeleton and inline error; removed old inline `<header>` JSX
- `app/games/[id]/page.tsx` - Added Header + Loader2 imports; key={gameId} on root; Header in all branches; Loader2 on delete button

## Decisions Made
- Error state moved inline (not full-screen early return) so Header + Logout button always remain accessible during API errors
- `key={gameId}` uses the existing `gameId` state variable populated by `useEffect` — no React.use() migration required per plan instructions
- Skeleton layout mirrors actual page structure (4 stat cards + 5 table row placeholders on dashboard; stat grid + section skeleton on game detail) for minimal layout shift

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both high-traffic pages (dashboard and game detail) now have shared Header with Logout in all states
- UX-01 through UX-05 requirements fulfilled for these pages
- Plan 06-05 (add game page) can proceed — the pattern (Header first, inline error, skeleton) is established

---
*Phase: 06-ux-polish*
*Completed: 2026-07-18*
