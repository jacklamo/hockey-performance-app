---
phase: 03-pdf-import
plan: 01
subsystem: testing-infrastructure
tags: [jest, testing, tdd, pdf-import]
dependency_graph:
  requires: []
  provides: [jest-config, parse-instat-pdf-tests, parse-pdf-route-tests]
  affects: [03-02-implementation]
tech_stack:
  added: [jest@30, @types/jest@30, jest-environment-node@30, ts-jest@29, @types/pdf-parse@1]
  patterns: [next/jest transformer, jest.mock with factory function for CJS modules]
key_files:
  created:
    - jest.config.ts
    - src/lib/__tests__/parse-instat-pdf.test.ts
    - app/api/games/parse-pdf/__tests__/route.test.ts
  modified:
    - package.json
key_decisions:
  - Use next/jest.js (with .js extension) for ESM-compatible import in Next.js 16
  - Use jest.mock('pdf-parse', () => jest.fn()) factory form instead of auto-mock because pdf-parse is CJS with function-as-default export
metrics:
  duration_minutes: 6
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 3 Plan 1: Jest Setup and Test Scaffold Summary

Jest installed and configured for Next.js 16; two test files define the extraction and validation contracts for the PDF import feature.

## What Was Built

Installed Jest testing infrastructure and created two test files that define the behavioral contract for the PDF import feature. These tests serve as the specification for Plan 03-02 (implementation).

**jest.config.ts** — Jest configured with `next/jest.js` transformer, `node` test environment, and `@/` module path alias. The `.js` extension on the import is required for ESM module resolution in Next.js 16.

**src/lib/__tests__/parse-instat-pdf.test.ts** — 7 unit tests defining the extraction contract for `parseInstatPdf`:
- Goals, assists, shots extraction from labeled text
- Opponent extraction from "vs. Team Name" pattern
- Date extraction from ISO format (2024-03-15)
- Empty object returned when no fields match
- Partial extraction (goals + assists only, shots key absent)

**app/api/games/parse-pdf/__tests__/route.test.ts** — 2 route validation tests + 1 todo:
- 400 when no file attached
- 400 when non-PDF file (text/plain) attached
- `test.todo` for unauthenticated 401 (auth mocking deferred)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d28c204 | chore(03-01): install Jest and configure for Next.js |
| 2 | 3e50f6e | test(03-01): add failing test stubs for parseInstatPdf and parse-pdf route |

## Verification Results

- `npx jest --passWithNoTests` with no test files: exits 0 (verified before Task 2)
- `src/lib/__tests__/parse-instat-pdf.test.ts`: 7 tests pass (implementation pre-existed from prior work at commit 28b7de9)
- `app/api/games/parse-pdf/__tests__/route.test.ts`: fails with "Cannot find module '../route'" — correct RED state, route implementation is Plan 03-02's responsibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed next/jest import path for ESM compatibility**
- **Found during:** Task 1 verification
- **Issue:** `import nextJest from 'next/jest'` failed with `ERR_MODULE_NOT_FOUND`; Next.js 16 requires the `.js` extension for ESM-compatible imports
- **Fix:** Changed to `import nextJest from 'next/jest.js'`
- **Files modified:** jest.config.ts
- **Commit:** d28c204

**2. [Rule 1 - Bug] Fixed pdf-parse mock setup in parser test**
- **Found during:** Task 2 verification
- **Issue:** `jest.mock('pdf-parse')` auto-mock did not produce a callable `jest.fn()` because pdf-parse is a CJS module with a function as its default export; `mockPdfParse.mockReset()` threw `TypeError: mockReset is not a function`
- **Fix:** Changed to `jest.mock('pdf-parse', () => jest.fn())` factory form to explicitly create a `jest.fn()` mock
- **Files modified:** src/lib/__tests__/parse-instat-pdf.test.ts
- **Commit:** 3e50f6e (captured in same commit)

### Notable Discoveries

- `src/lib/parse-instat-pdf.ts` already existed in the repository (created in prior work, commit 28b7de9) — this caused the parser test suite to pass immediately instead of being RED. This is acceptable: the test contract is established and verified.
- A duplicate test file `__tests__/parse-instat-pdf.test.ts` exists at the project root (pre-existing, not created in this plan). It tests the same contract with slightly different mock setup. Out of scope per deviation rules — noted for deferred cleanup.

## Self-Check: PASSED

- jest.config.ts: FOUND
- src/lib/__tests__/parse-instat-pdf.test.ts: FOUND
- app/api/games/parse-pdf/__tests__/route.test.ts: FOUND
- Commit d28c204: FOUND
- Commit 3e50f6e: FOUND
