# Project Research Summary

**Project:** Hockey Performance Tracker v2.0 -- UX Polish + NHL Data Pipeline
**Domain:** Next.js App Router web app + standalone Python data ingestion pipeline
**Researched:** 2026-07-07
**Confidence:** HIGH (UX polish), MEDIUM (NHL pipeline)

## Executive Summary

This milestone has two fully independent workstreams that share only a Postgres database. The UX polish workstream requires zero new npm packages -- every primitive is already installed in the existing Next.js 16 + next-auth v4 + Tailwind 4 stack. The Python NHL pipeline is a completely isolated Python project that reads from api-web.nhle.com and writes shot event data to a dedicated nhl_raw Postgres schema, entirely separate from the Prisma-managed app schema.

The recommended approach is two sequential phases. Phase 1 (UX polish) is lower-risk -- all patterns are well-documented, zero new dependencies, and the codebase already has the correct architectural foundations. Phase 2 (NHL pipeline) carries medium risk concentrated in the API rate limits and inconsistent play-by-play field schema across seasons, both mitigated by exponential backoff with tenacity and .get() with defaults for all field extraction.

The single most important architectural decision is schema isolation: the pipeline must write to the nhl_raw schema (not public) and must use DATABASE_URL_UNPOOLED (not the PgBouncer-pooled DATABASE_URL). Getting this wrong risks lock contention against the live application and connection errors during bulk inserts. Everything else is incremental work on top of existing validated patterns.
## Key Findings

### Recommended Stack

The existing stack is unchanged and requires no additions for UX polish. For the Python pipeline, a minimal four-package environment (httpx, psycopg[binary] v3, tenacity, python-dotenv) is sufficient. The pipeline lives at /data-pipeline/ as a standalone project with no shared code with the Next.js app.

**Core technologies:**
- next-auth v4.24.13 (already installed): signOut with explicit callbackUrl handles logout -- do NOT upgrade to v5, breaking API change
- loading.tsx + Tailwind animate-pulse: route-level skeleton UI -- zero new dependencies, built into App Router file conventions
- lucide-react (already installed): Loader2 + animate-spin for mutation in-flight spinners
- httpx 0.28.x (Python): async HTTP client for concurrent NHL API game fetches with semaphore throttling
- psycopg[binary] 3.2.x (Python): psycopg3 for bulk inserts; sync mode sufficient; use DATABASE_URL_UNPOOLED (not PgBouncer)
- tenacity 9.x (Python): decorator-based exponential backoff for 429/503 handling

### Expected Features

**Must have (table stakes) -- Phase 1:**
- Logout button wired to signOut with callbackUrl /auth/login -- visible on all protected pages; trust requirement
- loading.tsx on /dashboard, /games, /games/[id] -- skeleton matching real layout to prevent CLS
- Mutation in-flight button disable on all form submit buttons -- prevents double-submit data corruption
- Empty states on zero-data views -- guides user, prevents blank white area that looks broken
- error.tsx on /dashboard and /games -- graceful failure with retry option

**Must have (table stakes) -- Phase 2:**
- Season schedule walk (all game IDs for a season)
- Per-game play-by-play fetch + shot event filtering (shot-on-goal, goal, missed-shot, blocked-shot)
- Idempotent upsert: INSERT ... ON CONFLICT (game_id, event_id) DO NOTHING
- Rate limiting with exponential backoff (0.5-1s default; tenacity on 429/503)
- Progress logging + post-ingestion row count validation

**Should have (competitive):**
- Granular per-section Suspense on dashboard -- only if measurably slow
- Checkpoint/resume manifest (pipeline_runs table) -- reduces re-run cost after partial failures

**Defer (v2+):**
- Optimistic UI on mental state sliders -- sliders already work, this is an enhancement
- Scheduled pipeline execution via GitHub Actions cron
- xG model training on ingested shot data
### Architecture Approach

All existing page components are client components using useEffect + useState for data fetching -- correct for this codebase given the interactive mutation states required. The loading state strategy is intentionally two-layered: loading.tsx handles the 50-300ms route-transition gap before JS mounts; the existing isLoading state handles the async data fetch after mount. A shared Header component extracted to app/components/Header.tsx eliminates the currently-duplicated inline header markup across every page. The Python pipeline is a fully isolated sidecar -- separate interpreter, separate dependencies, separate .env, communicating only through Postgres under a separate schema.

**Major components:**
1. app/components/Header.tsx (NEW) -- shared header with logout button; eliminates duplicate inline header across all pages
2. app/[route]/loading.tsx (NEW x3) -- route-transition skeletons at /dashboard, /games, /games/[id]; shown automatically by Next.js App Router
3. data-pipeline/ (NEW) -- standalone Python project: fetch_shots.py -> transform.py -> load.py -> validate/spot_check.py; no shared code with Next.js app

### Critical Pitfalls

1. **loading.tsx does not re-trigger on same-segment navigation** -- navigating /games/1 to /games/2, React reuses the component instance and no skeleton appears. Fix: add Suspense with key={params.id} wrapper inside page.tsx for per-ID routes.

2. **signOut without explicit callbackUrl breaks in production** -- default redirect can loop through callbackUrl query params or redirect to localhost if NEXTAUTH_URL is misconfigured. Fix: always call signOut with callbackUrl /auth/login and verify NEXTAUTH_URL in Vercel dashboard.

3. **NHL API nullable fields across seasons cause KeyError crashes** -- xCoord, yCoord, shotType absent in older seasons. Fix: always use event.get() with defaults; make all shot detail columns nullable.

4. **No idempotency on pipeline re-runs causes duplicate rows** -- without ON CONFLICT DO NOTHING, every re-run doubles affected game rows. Fix: unique constraint on (game_id, event_id) and upsert pattern -- implement before any ingestion run.

5. **Pipeline writes to public schema risks locking app tables** -- unqualified table names can collide with future app tables; long transactions block the connection pool. Fix: set search_path = nhl_raw in all pipeline connections; use DATABASE_URL_UNPOOLED.
## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: UX Polish -- Logout, Loading States, Empty/Error States

**Rationale:** Zero new dependencies, well-documented patterns from official Next.js and NextAuth sources, directly improves usability of all existing features. Establishes the shared Header component that subsequent UX work builds on.

**Delivers:** Production-quality UX -- no blank screens, no broken logout, no double-submit bugs, graceful error handling.

**Addresses:** Logout button, loading.tsx skeletons, mutation isPending button states, empty states, error.tsx boundaries.

**Build order:** Header.tsx first (all page modifications depend on it) -> dashboard page (validates Header) -> remaining page modifications -> loading.tsx files (independent) -> UX audit.

**Avoids:** Pitfall 4 (signOut missing callbackUrl), Pitfall 5 (NEXTAUTH_URL missing in production), Pitfall 1 (loading.tsx same-segment re-trigger -- add key={params.id} on game detail), Pitfall 2 (single Suspense boundary blocks entire page), Pitfall 3 (useSearchParams without Suspense).

### Phase 2: NHL Shot Data Pipeline

**Rationale:** Fully isolated from the Next.js app -- depends only on the Postgres database. Each stage (fetch, transform, load, validate) is a hard sequential dependency -- cannot be split further.

**Delivers:** Season-complete shot event data in nhl_raw.shot_events -- foundational dataset for future xG model work.

**Uses:** Python 3.12+, httpx, psycopg[binary] v3, tenacity, python-dotenv. DATABASE_URL_UNPOOLED from existing Vercel secrets -- no new secrets needed.

**Build order:** SQL migration (table must exist before writes) -> config.py + requirements.txt -> fetch_shots.py (single-game test) -> transform.py (nullable .get()) -> load.py (upsert + idempotency) -> full season run -> spot_check.py (row count validation).

**Avoids:** Pitfall 6 (NHL API 429 without backoff), Pitfall 7 (nullable fields crash), Pitfall 8 (no idempotency -- duplicate rows), Pitfall 9 (shared schema corruption), Pitfall 10 (no ingestion manifest).

### Phase Ordering Rationale

- Phase 1 before Phase 2: UX polish improves the existing product for the current user immediately; pipeline is net-new capability that does not block current app usage.
- Within Phase 1, Header.tsx is extracted first -- all subsequent page modifications depend on it (hard build dependency).
- Within Phase 2, SQL migration runs before any Python code -- load.py fails if the target table does not exist.
- Two-phase split maps directly to the two independent concerns in research and avoids context switching mid-milestone.

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1 (UX Polish):** All patterns documented from official sources and validated against the live codebase. No research phase needed.

Phases needing validation during implementation:
- **Phase 2 (NHL Pipeline):** NHL API endpoint behavior is MEDIUM confidence. Validate schedule walk endpoint and game ID format with a live API call before writing the full season loop. Rate limit threshold is empirical -- monitor for 429s during initial single-game test before scaling to full season.
## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (UX) / MEDIUM (Pipeline) | Next.js/NextAuth from official docs; Python packages from official PyPI + psycopg team. NHL API is unofficial community reference. |
| Features | HIGH (UX) / MEDIUM (Pipeline) | UX features from official React + Next.js docs. Pipeline features from unofficial NHL API docs -- endpoint behavior not guaranteed stable. |
| Architecture | HIGH | Based on direct inspection of live codebase files. No inference required. |
| Pitfalls | HIGH (Next.js) / MEDIUM (NHL API) | Next.js pitfalls from official GitHub issues (#53543, #73474) and official docs. NHL API pitfalls from community sources only. |

**Overall confidence:** HIGH for Phase 1, MEDIUM for Phase 2.

### Gaps to Address

- **NHL API rate limit threshold:** No official documentation. Community consensus is 1 req/s but empirical. Monitor during first full-season run and adjust semaphore/sleep accordingly.
- **NHL API schedule endpoint format:** Documented in unofficial reference only. Validate with a live call before writing the full season loop -- the NHL has changed endpoint paths previously.
- **useSearchParams audit:** Requires running next build to surface all components calling useSearchParams without Suspense wrapper -- not fully enumerable without a build-time check.

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/api-reference/file-conventions/loading -- App Router loading.tsx behavior
- https://nextjs.org/docs/app/guides/streaming -- Granular Suspense patterns
- https://react.dev/reference/react/useTransition -- mutation in-flight pattern
- https://next-auth.js.org/getting-started/client -- signOut function signature and options
- https://github.com/vercel/next.js/issues/53543 -- loading.tsx same-segment navigation behavior
- https://github.com/vercel/next.js/issues/73474 -- loading.tsx Suspense on second page load
- https://neon.com/docs/guides/python -- DATABASE_URL_UNPOOLED for direct connections
- Direct code inspection of app/dashboard/page.tsx, middleware.ts, prisma/schema.prisma, src/lib/auth.ts

### Secondary (MEDIUM confidence)
- https://github.com/Zmalski/NHL-API-Reference -- NHL API endpoint reference including play-by-play schema
- https://pypi.org/project/nhl-api-py/ -- Python wrapper documenting endpoints
- https://www.tigerdata.com/blog/psycopg2-vs-psycopg3-performance-benchmark -- psycopg3 recommended for new projects
- https://airbyte.com/data-engineering-resources/idempotency-in-data-pipelines -- ON CONFLICT DO NOTHING pattern

---
*Research completed: 2026-07-07*
*Ready for roadmap: yes*