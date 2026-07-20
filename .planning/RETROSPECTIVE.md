# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-07-07
**Phases:** 5 | **Plans:** 17 | **Timeline:** 247 days (2025-11-03 → 2026-07-07)

### What Was Built

- Real database connection (Neon Postgres) — all mock data bypasses removed, full-stack persistence verified
- Game management: edit (pre-filled form), delete (in-page confirmation), mental state nudge on dashboard
- Instat PDF import — regex-based parser extracts goals, assists, shots, opponent, date, +/-, ice time
- Recharts dashboard — summary cards, correlation insights (5-game gate), line + bar charts, mobile-responsive
- Production deployment on Vercel — security headers (CSP, HSTS), rate limiting, secrets in Vercel dashboard

### What Worked

- Wave-based plan execution (Wave 0 tests → Wave 1 implementation) kept logic testable before wiring UI
- Pure function extraction pattern (`chart-utils.ts`, `parse-instat-pdf.ts`) made unit testing straightforward
- Baselining Prisma migration (migrate resolve --applied) avoided destructive reset on pre-existing tables
- Vercel Marketplace for Neon was zero-config — DATABASE_URL auto-injected, no manual connection string setup

### What Was Inefficient

- Phase 2 completion was never reflected in ROADMAP.md (showed "Not started" despite 3 SUMMARY.md files) — documentation drift accumulated across multiple phases
- Audit was run after Phase 5 but the proxy.ts rename fix required a separate post-audit commit — could have been caught earlier with a lighter check before the final plan
- Test fixtures for PDF parser required a full realignment plan (03-03) after discovering the real Instat format differed from assumed format — research before implementation would have saved a plan
- REQUIREMENTS.md checkbox drift: 4 requirements were implemented and verified but never checked off

### Patterns Established

- Async params pattern for Next.js 16 dynamic routes: `params: Promise<{ id: string }>`, resolve in `useEffect`, guard all side-effects on resolved `gameId`
- `middleware.ts` at project root (not `src/`) required by Next.js App Router; `export default` required for registration
- CSP `unsafe-inline` locked decision — nonces incompatible with Next.js static optimization
- HSTS production-only via `isDev` flag prevents localhost redirect loop
- Build command pattern: `prisma generate && prisma migrate deploy && next build` ensures schema stays in sync on every Vercel deploy

### Key Lessons

1. Verify real format before writing parsers — the PDF fixture realignment (Plan 03-03) was avoidable with a 5-minute manual inspection of an actual Instat PDF export
2. Update ROADMAP.md plan checkboxes immediately when a plan completes — drift accumulates fast and creates confusion at milestone review time
3. Run the middleware check early — the proxy.ts misname was a silent failure (no runtime error, just dead code) that only surfaced at audit time
4. Pure functions first, then wire to React — `chart-utils.ts` and `parse-instat-pdf.ts` patterns made testing trivial and kept components clean

### Cost Observations

- Sessions: multiple across 247 days (intermittent development)
- Notable: brownfield start (~80% feature-complete on mock data) compressed the implementation work; most effort was in integration, testing, and deployment rather than greenfield building

---

## Milestone: v2.0 — Polish + NHL Pipeline

**Shipped:** 2026-07-18
**Phases:** 2 (6–7) | **Plans:** 8 | **Timeline:** 1 day

### What Was Built

- Shared Header component with NextAuth signOut Logout button — callbackUrl protection, wired to all main pages
- Three route-level loading.tsx skeleton files with CSS shimmer animation — no blank screens
- /games page rebuilt with complete lifecycle (skeleton, inline error + retry, empty state CTA, content table)
- Dashboard and game detail restructured with shared Header in all states + key={gameId} same-segment remount
- Loader2 spinner on all form submit buttons (add, edit, mental state) and PDF import label
- Complete Python NHL data pipeline: argparse CLI, schedule walker, shot extractor, idempotent upsert, tenacity retry — 89k+ shots full season, 0 duplicates on re-run

### What Worked

- Wave 0 TDD for the pipeline: 12 test stubs before any implementation caught the `_psycopg_url()` Prisma param issue before it could hide in integration
- Mechanical plan scope for Phase 6 (zero new deps, existing primitives only) kept execution extremely fast — 8 plans in one day
- Error states rendered inline (not full-screen) as a first-principles decision — Logout always accessible, consistent across all pages
- Smoke testing against a single-day date range before the full-season run — fast feedback loop, confirmed all API assumptions

### What Was Inefficient

- UX-01 scope was narrowed in Phase 6 CONTEXT.md without updating the requirement — created a gap that only surfaced at audit time. The verifier accepted the narrowed scope; a direct comparison against the requirement text would have caught it
- VALIDATION.md files were created but left in draft state (nyquist_compliant: false) despite the work being done — stale status requires manual correction
- smoke_test.py was written as a standalone utility but left undocumented in the repo — should be either deleted or added to CI

### Patterns Established

- `_psycopg_url()` pattern: always strip ORM-specific query params before passing DATABASE_URL to a different DB client
- Inline error pattern: error state renders below the Header (not as a full-screen replacement) so navigation remains accessible
- isLoading starts as `true` (not `false`) for pages that fetch on mount — avoids flash of empty state before first data load
- progress reporting every N items (not every item) in batch scripts — keeps stdout readable at scale

### Key Lessons

1. Compare implementation scope against the exact requirement text at plan-writing time, not just at verification — narrowed scope creates gaps that compound if not caught early
2. Smoke test with a narrow date range before committing to a full-season API run — confirms API shape assumptions cheaply
3. Update VALIDATION.md immediately when Wave 0 tests pass — stale draft status misleads future audits
4. `isLoading: true` as initial useState value is the correct default for data-fetching pages — prevents empty state flash

### Cost Observations

- Sessions: 1 concentrated day (2026-07-18)
- Notable: Both phases executed in a single day — mechanical scope (UX polish) + well-defined contract (TDD stubs) compressed execution dramatically compared to v1.0's 247-day span

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
| --------- | ------ | ----- | ---------- |
| v1.0 | 5 | 17 | First milestone — established patterns for async params, pure function extraction, wave-based execution |
| v2.0 | 2 | 8 | Mechanical scope + TDD stubs → both phases shipped in 1 day; inline error pattern established |

### Cumulative Quality

| Milestone | Tests | Notes |
| --------- | ----- | ----- |
| v1.0 | 36 | Partial coverage (nyquist_compliant: false on all phases); rate limiter, chart utils, PDF parser covered |
| v2.0 | 48 | 36 TS tests (unchanged) + 12 Python pipeline tests (all green); VALIDATION.md files left in draft state |

### Top Lessons (Verified Across Milestones)

1. Research the real external format before writing a parser — assumptions diverge from reality
2. Keep documentation in sync with implementation — checkbox drift and scope narrowing compound quickly
3. Compare scope against the exact requirement text at plan time — not just at verification
4. Smoke test with a narrow input range before committing to a large-scale API or data run
