---
phase: 01-database-foundation
plan: "03"
subsystem: auth
tags: [next-auth, jwt, middleware, credentials, bcrypt]

# Dependency graph
requires:
  - phase: 01-02
    provides: prisma migration baselined, canonical src/app/ directory confirmed
provides:
  - requireAuth() that throws Unauthorized when no session exists
  - NextAuth authorize() without dev bypass (propagates DB errors)
  - middleware.ts at project root protecting /dashboard and /games routes
affects:
  - all API routes using requireAuth()
  - frontend dashboard and games pages
  - phase 02 and beyond (all real-data work depends on real auth)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - next-auth/middleware canonical export pattern for Next.js App Router route protection
    - requireAuth() throws Error('Unauthorized') — callers catch or let it propagate to 500

key-files:
  created:
    - middleware.ts
  modified:
    - src/lib/auth.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - src/app/api/auth/signup/route.ts

key-decisions:
  - "Dev-user bypasses removed from requireAuth(), authorize(), and signup — real Railway DB session required for all auth flows"
  - "middleware.ts placed at project root (not src/) per Next.js App Router requirement"
  - "Signup route inner try/catch also removed to match plan's no-dev-bypass mandate (deviation Rule 2)"

patterns-established:
  - "requireAuth() throws Error('Unauthorized') — never silently falls back to a mock user"
  - "authorize() lets DB errors propagate — no catch blocks that return fake users"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 12min
completed: 2026-03-09
---

# Phase 1 Plan 03: Remove Auth Bypasses and Add Route Protection Summary

**Dev-user hardcoded bypasses removed from requireAuth(), NextAuth authorize(), and signup route; middleware.ts added to gate /dashboard and /games behind real JWT session**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-09T00:00:00Z
- **Completed:** 2026-03-09T00:12:00Z
- **Tasks:** 2 (+ 1 auto-fix deviation)
- **Files modified:** 4

## Accomplishments

- requireAuth() now throws Error('Unauthorized') when no session — dev-user-id bypass removed
- NextAuth authorize() propagates DB errors cleanly — inner try/catch fallback removed
- middleware.ts at project root protects /dashboard and /games via next-auth/middleware redirect to /auth/login
- Signup route also cleaned of its matching dev-user-id bypass (caught during verification)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove dev-user bypass from requireAuth() and NextAuth authorize()** - `f6f8b53` (fix)
2. **Task 2: Create middleware.ts for route protection** - `f04838f` (feat)
3. **Deviation auto-fix: signup route bypass removal** - `6e295d5` (fix)

## Files Created/Modified

- `src/lib/auth.ts` - requireAuth() now throws Unauthorized; dev-user-id bypass removed
- `src/app/api/auth/[...nextauth]/route.ts` - authorize() inner try/catch dev bypass removed
- `middleware.ts` - Created at project root; exports next-auth/middleware; matcher covers /dashboard and /games
- `src/app/api/auth/signup/route.ts` - Inner try/catch that returned dev-user-id on DB error removed

## Decisions Made

- Dev bypasses removed from all three auth touch points simultaneously to satisfy the plan's overall verification (`grep -rn "dev-user-id" src/` returns no matches)
- middleware.ts placed at the project root (same level as package.json), not inside src/ or app/, per Next.js App Router convention
- The signup route fix was auto-applied under Deviation Rule 2 since leaving it would have kept the dev-user-id string in src/ and broken the plan's success criteria

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed dev-user bypass from signup route**
- **Found during:** Post-task verification (`grep -rn "dev-user-id" src/`)
- **Issue:** `src/app/api/auth/signup/route.ts` had its own inner try/catch that returned `id: 'dev-user-id'` on any DB error. The plan only specified fixing `auth.ts` and the NextAuth route, but plan verification requires zero matches for `dev-user-id` across all of `src/`. Leaving it would have silently returned a fake user and bypassed real signup.
- **Fix:** Removed the inner try/catch wrapper. DB errors now propagate to the outer try/catch which returns a 500 response.
- **Files modified:** `src/app/api/auth/signup/route.ts`
- **Verification:** `grep -rn "dev-user-id" src/` returns no matches
- **Committed in:** `6e295d5`

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical fix)
**Impact on plan:** Auto-fix was necessary for correctness and plan success criteria. No scope creep.

## Issues Encountered

None — all fixes applied cleanly without compilation errors.

## User Setup Required

None - no external service configuration required. However, existing browser sessions using `dev-user-id` will now receive 401/Unauthorized responses from all API routes. Users must sign up with a real account against the Railway DB to authenticate.

## Next Phase Readiness

- Auth is fully real: all three bypass vectors removed, route protection in place
- Phase 2 (real data) can now safely identify users by session — no more phantom dev-user-id
- Any existing browser sessions need to be cleared (sign out or delete cookies) before testing

---
*Phase: 01-database-foundation*
*Completed: 2026-03-09*
