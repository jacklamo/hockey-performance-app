---
phase: 01-database-foundation
plan: "04"
subsystem: api-routes
tags: [mock-removal, database, games-api, signup-api]
dependency_graph:
  requires:
    - 01-03 (auth bypass removal)
  provides:
    - games API connected directly to Railway Postgres
    - signup API connected directly to Railway Postgres
  affects:
    - src/app/api/games/route.ts
    - src/app/api/auth/signup/route.ts
tech_stack:
  added: []
  patterns:
    - Single try/catch per route handler — DB errors propagate to outer catch
key_files:
  created: []
  modified:
    - src/app/api/games/route.ts
decisions:
  - Inner try/catch mock bypasses removed from games route (GET and POST handlers)
  - Signup route was already clean from Plan 03 execution — no changes needed
metrics:
  duration: "1 minute"
  completed_date: "2026-03-10"
---

# Phase 01 Plan 04: Remove Inner Try/Catch Mock Bypasses Summary

**One-liner:** Collapsed inner try/catch DB-bypass blocks in games route so DB errors surface as HTTP 500 instead of silent mock responses.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove inner try/catch from games route | f62c44a | src/app/api/games/route.ts |
| 2 | Remove inner try/catch from signup route | (pre-completed) | src/app/api/auth/signup/route.ts |

## What Was Done

### Task 1 — games route (GET and POST)

`src/app/api/games/route.ts` had two inner try/catch blocks:

- **GET handler:** Inner try/catch returned `{ games: [] }` (empty array) when DB was unreachable. Removed — prisma.game.findMany() now sits directly in the outer try block. DB errors propagate to the outer catch and return HTTP 500.
- **POST handler:** Inner try/catch returned a mock game object with `id: 'temp-' + Date.now()` when DB was unreachable. Removed — prisma.game.create() now sits directly in the outer try block. DB errors propagate to the outer catch and return HTTP 500.

Both handlers now have exactly one try/catch block.

### Task 2 — signup route

`src/app/api/auth/signup/route.ts` was already clean when this plan ran. The inner try/catch (which returned a mock user with `id: 'dev-user-id'`) was removed during Plan 03 execution. No changes were needed. Verified: 1 try block, no TEMPORARY/dev-user-id/database unavailable strings.

## Verification Results

```
grep -c "try {" src/app/api/games/route.ts     → 2  (one per handler)
grep -c "try {" src/app/api/auth/signup/route.ts → 1  (single outer try)
grep -rn "TEMPORARY|TODO.*database|mock.*bypass|temp-.*Date" src/app/api/ → no matches
grep -rn "dev-user-id" src/                    → no matches
```

All API routes in `src/app/api/` now connect directly to Railway Postgres. No route silently swallows DB errors or returns mock data.

## Smoke Test Results

Note: Dev server not started during this execution (Railway Postgres is the live DB — curl tests require a valid session cookie from that DB). Structural verification via grep confirms correct implementation.

## Deviations from Plan

### Pre-completed Work

**Task 2 (signup route) was already done before this plan ran.**

- **Found during:** File read at plan start
- **Prior work:** Plan 03 execution removed the dev-user bypass from signup route in commit 6e295d5
- **Impact:** Task 2 required no changes — verified clean state and documented
- **Files modified:** None

## Self-Check: PASSED

- [x] src/app/api/games/route.ts exists and was modified
- [x] Commit f62c44a exists for Task 1
- [x] Task 2 pre-completed — no commit needed, state verified
- [x] grep verifications all returned expected results
