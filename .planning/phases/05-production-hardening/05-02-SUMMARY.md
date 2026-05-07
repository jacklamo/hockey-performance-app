---
phase: 05-production-hardening
plan: 02
subsystem: infrastructure
tags: [security, headers, csp, next.config]
dependency_graph:
  requires: []
  provides: [security-headers-all-routes]
  affects: [all-http-responses]
tech_stack:
  added: []
  patterns: [next.config-headers-function, environment-conditional-hsts]
key_files:
  created: []
  modified:
    - next.config.ts
decisions:
  - "CSP uses unsafe-inline (no nonces/strict-dynamic) to preserve Next.js static optimization — locked decision"
  - "HSTS conditionally applied in production only via isDev flag to prevent localhost redirect loop"
  - "unsafe-eval added to script-src in dev only for Next.js HMR support"
metrics:
  duration: "43s"
  completed: "2026-05-07"
  tasks: 1
  files: 1
---

# Phase 5 Plan 02: Security Headers Summary

Security HTTP response headers applied to all routes via Next.js `headers()` async function in `next.config.ts`. CSP uses `unsafe-inline` per locked decision. HSTS is production-only to prevent localhost redirect loops.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add security headers to next.config.ts | 58d1775 | next.config.ts |

## What Was Built

Added the `headers()` async function to `next.config.ts` covering all routes via `source: '/(.*)'`. The following 6 headers are now injected on every HTTP response:

- `Content-Security-Policy` — CSP with `unsafe-inline` for scripts/styles, `unsafe-eval` in dev only
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production only)

`serverExternalPackages: ['pdf-parse']` preserved intact.

## Decisions Made

1. **CSP unsafe-inline**: Locked user decision — nonces/strict-dynamic not used so Next.js static optimization is not broken.
2. **HSTS production-only**: `isDev` flag (derived from `NODE_ENV`) guards HSTS injection. This prevents the browser from permanently redirecting `http://localhost` to `https://localhost`.
3. **unsafe-eval in dev**: Required for Next.js HMR (hot module replacement) — only active when `NODE_ENV === 'development'`.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit`: PASS (no output)
- `npx jest`: 36 passed, 1 todo, 4 test suites — all green
- `next.config.ts` visually contains all 6 header keys

## Self-Check: PASSED

- next.config.ts exists and contains `headers()` function: FOUND
- `serverExternalPackages: ['pdf-parse']`: FOUND
- HSTS wrapped in isDev condition: FOUND
- Commit 58d1775 exists: FOUND
