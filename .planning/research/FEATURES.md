# Feature Research

**Domain:** Hockey performance web app — v2.0 UX polish + NHL data pipeline
**Researched:** 2026-07-07
**Confidence:** HIGH (UX patterns from official Next.js docs + React docs), MEDIUM (NHL API — unofficial reference, unversioned)

## Feature Landscape

Two distinct feature categories this milestone: (A) UX polish on the existing Next.js app, (B) a standalone Python pipeline.

---

### Category A — UX Polish (Next.js App Router)

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Logout button (visible in nav/header) | Any auth-gated app exposes logout; hidden logout = trust failure | LOW | `signOut()` from `next-auth/react` in a Client Component; use `callbackUrl: "/auth/login"` to redirect post-logout; button should be visible on every protected page |
| Session cleared on signOut | Users expect clicking logout to actually end their session | LOW | NextAuth credentials + JWT strategy: `signOut()` deletes `next-auth.session-token` cookie automatically — no extra work needed; verify cookie cleared in browser devtools |
| Redirect to login after logout | Standard web behavior; staying on a protected page is broken | LOW | Pass `{ callbackUrl: "/auth/login" }` to `signOut()`; middleware already handles unauthenticated redirect as fallback |
| Route-level loading states (initial page load) | Blank screen during data fetch feels broken on slow connections | LOW | Add `loading.tsx` alongside each `page.tsx` in `/dashboard`, `/games`, `/games/[id]`, `/games/[id]/edit`; Next.js wraps route in `<Suspense>` automatically |
| Skeleton UI (not spinner) for loading | Skeleton preserves layout; spinner causes content reflow/CLS | LOW-MEDIUM | Skeleton components match final layout dimensions — same grid, same spacing; prevents Cumulative Layout Shift when data resolves |
| Mutation in-flight disabled button | Users double-submit forms; second submit corrupts data | LOW | Use `useTransition` + `isPending` on Client Components; `disabled={isPending}` on submit button; for Server Actions, `useFormStatus` inside the form |
| Empty states for zero-data views | Dashboard/games list with 0 records should guide the user, not show blank space | LOW | "No games yet — add your first game" CTA; already partially implemented on dashboard; audit all list views |
| Error states for failed fetches | Silent failure leaves users confused | MEDIUM | Per-route error boundary (`error.tsx` alongside `page.tsx`); show user-friendly message + retry option; log to console for debugging |

#### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Granular Suspense streaming (per-section) | Dashboard chart and cards load independently; faster perceived performance | MEDIUM | Wrap individual slow sections in `<Suspense fallback={<SectionSkeleton />}>`; faster sections (summary cards) appear before slower ones (charts); only worth doing if data fetches are truly independent |
| Optimistic UI on mental state sliders | Instant feedback; sliders feel native | HIGH | Requires `useOptimistic` + server action pattern; defer to v2.x — slider already works, this is enhancement only |

#### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full-page spinner overlay on every action | "Shows something is happening" | Blocks entire UI, prevents reading existing content, feels slow | Inline button `isPending` state + skeleton loaders per section |
| Global loading bar (NProgress-style) | Familiar SPA pattern | Next.js App Router manages its own navigation transitions; third-party progress bars conflict with React Suspense streaming and cause double-indicators | Use `loading.tsx` route-level Suspense; it handles the same user need |
| Toast notifications for every mutation | "Feedback on success" | Toast fatigue; success is implied by data updating on screen | Reserve toasts for failures and non-obvious async operations (e.g., PDF import) |

---

### Category B — Python NHL Data Pipeline (`/data-pipeline`)

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Season schedule walk (all game IDs) | Can't pull play-by-play without knowing game IDs; this is the input driver | LOW | `GET https://api-web.nhle.com/v1/schedule/YYYY-MM-DD` — paginate through full season by walking dates or use season schedule endpoint; yields list of `gameId` integers |
| Per-game play-by-play fetch | Core data source for shot events | LOW | `GET https://api-web.nhle.com/v1/gamecenter/{gameId}/play-by-play`; returns array of events with `typeDescKey` field |
| Shot event filtering | Only shot-type events needed for xG model | LOW | Filter on `typeDescKey` in `["shot-on-goal", "goal", "missed-shot", "blocked-shot"]`; extract coordinates, player, period, time, game context |
| Upsert into Postgres (idempotency) | Pipeline must be re-runnable without duplicates | MEDIUM | Composite unique key: `(game_id, event_id)`; use `INSERT ... ON CONFLICT (game_id, event_id) DO NOTHING` or DO UPDATE; psycopg2 or SQLAlchemy Core both support this |
| Rate limiting / backoff | NHL API is public/unofficial; no auth; aggressive polling risks IP block | LOW-MEDIUM | 1 req/sec sleep between game fetches (`time.sleep(1)`); on 429 read `Retry-After` header, sleep that value; exponential backoff fallback (1s → 2s → 4s → max 60s) with jitter |
| Per-game error handling (continue on failure) | One bad game response should not abort the full season | LOW | Per-game `try/except` block; log failed `gameId` to a file or stderr; continue to next game; re-runnable idempotency means failed games can be retried in isolation |
| Progress logging | Full season = ~1,300+ games; silent script looks hung | LOW | `tqdm` progress bar over game list, or simple `print(f"[{i}/{total}] gameId={gameId}")` every N games; log row counts inserted per game |
| Post-ingestion row count validation | Sanity check that insert worked; catch silent failures | LOW | `SELECT COUNT(*) FROM nhl_shots WHERE season = '20242025'` after run; compare against expected range (NHL averages ~50-70 shot events per game × 1,312 regular season games) |

#### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Spot-check against NHL.com | Confirms data accuracy, not just row count | LOW | Pick 3-5 specific games, compare shot totals from pipeline against NHL.com game summary page; one-time manual step, document in README |
| Structured ETL separation (fetch / transform / load) | Maintainable; each stage testable in isolation | LOW-MEDIUM | `fetch.py` — HTTP calls only; `transform.py` — filter + reshape events into flat dicts; `load.py` — upsert to Postgres; `pipeline.py` — orchestrates all three; `config.py` — DATABASE_URL + season constants |
| Checkpoint / resume on partial runs | Re-start after failure without re-fetching completed games | MEDIUM | Track completed `gameId` values in a local file or a `pipeline_runs` table; skip already-processed games on resume; lower priority if upsert idempotency makes re-runs cheap |

#### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Async/aiohttp for concurrent game fetching | "Faster ingestion" | NHL API has no published rate limits; concurrent requests increase IP-block risk; full season ingestion is a one-time operation (hours is acceptable) | Sequential with `time.sleep(1)` — safe, simple, auditable |
| ORM models (SQLAlchemy ORM) for pipeline | "Consistency with app codebase" | App uses Prisma (TypeScript); Python ORM adds a dependency without matching benefit; raw SQL upserts are simpler and more transparent for ETL | `psycopg2` with parameterized `INSERT ... ON CONFLICT` statements |
| Streaming ingestion / real-time pipeline | "Current data" | NHL API is not a real-time feed; play-by-play is game-complete only; real-time would require a paid data provider | Nightly batch job or manual seasonal re-run is sufficient for an xG model |

---

## Feature Dependencies

```
[Logout button]
    requires --> [NextAuth signOut() client-side call]  (already available — next-auth/react)
    requires --> [Protected route redirect]  (already built in middleware.ts)

[Route loading.tsx skeletons]
    requires --> [Page components are async Server Components]  (already true — App Router default)
    requires --> [Data fetching is inside the page, not layout]  (verify per-route)

[Mutation isPending button]
    requires --> [Component is a Client Component ("use client")]
    requires --> [useTransition or useFormStatus]  (React built-in, no new dependencies)

[Python pipeline — upsert]
    requires --> [nhl_shots table exists in Neon Postgres]  (new migration needed)
    requires --> [DATABASE_URL_UNPOOLED available]  (already in Vercel env; use direct URL for pipeline)

[Python pipeline — play-by-play fetch]
    requires --> [Season schedule walk produces gameId list]  (sequential dependency)

[Post-ingestion validation]
    requires --> [Upsert load step complete]
```

### Dependency Notes

- **Logout button requires no new packages** — `signOut` is already imported from `next-auth/react` if any client component uses `useSession`.
- **loading.tsx requires no new packages** — file convention only; place file, export default a React component.
- **Pipeline upsert requires a new Postgres table** — `nhl_shots` schema must be defined before load step; a plain SQL migration file (not Prisma, since pipeline is standalone Python) is simplest.
- **Pipeline uses DATABASE_URL_UNPOOLED** — Neon's pooled URL (PgBouncer) does not support extended query protocol needed by psycopg2 by default; use `DATABASE_URL_UNPOOLED` (direct connection) for the Python pipeline.

---

## MVP Definition

### This Milestone — Ship With (v2.0)

- [x] Logout button wired to `signOut({ callbackUrl: "/auth/login" })` — visible on every protected page
- [x] Session cookie cleared and user redirected on logout
- [x] `loading.tsx` on `/dashboard`, `/games`, `/games/[id]` with skeleton placeholders
- [x] Submit button `disabled={isPending}` on add-game form, edit-game form, mental state form
- [x] Empty state copy for zero-game dashboard and empty games list
- [x] `error.tsx` on at least `/dashboard` and `/games` for failed data fetches
- [x] Python pipeline: schedule walk + play-by-play fetch + shot filtering + upsert + progress logging
- [x] Post-ingestion row count validation

### Add After Validation (v2.x)

- [ ] Granular per-section Suspense on dashboard (cards vs charts streaming independently) — only if dashboard load time is measurably slow
- [ ] Checkpoint/resume for pipeline — only if full-season runs are regularly interrupted
- [ ] Spot-check script comparing pipeline counts against NHL.com game pages

### Future Consideration (v3+)

- [ ] Optimistic UI on mental state sliders
- [ ] xG model training using ingested shot data
- [ ] Scheduled pipeline execution (cron via GitHub Actions or Vercel Cron)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Logout button | HIGH — auth trust requirement | LOW | P1 |
| Route loading.tsx skeletons | HIGH — every page affected | LOW | P1 |
| Mutation in-flight button disable | HIGH — prevents double-submit data corruption | LOW | P1 |
| Empty states audit | MEDIUM — polish, not breaking | LOW | P1 |
| error.tsx boundaries | MEDIUM — graceful failure | LOW | P1 |
| Python pipeline (fetch + filter + upsert) | HIGH — new capability, future xG model | MEDIUM | P1 |
| Post-ingestion validation | MEDIUM — data confidence | LOW | P1 |
| Granular Suspense streaming | LOW — marginal perf gain for current scale | MEDIUM | P3 |
| Optimistic slider UI | LOW — sliders already work | HIGH | P3 |
| Pipeline checkpoint/resume | LOW — idempotent upsert makes reruns cheap | MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Implementation Notes by Feature

### Logout Button
- Import `signOut` from `next-auth/react`; component must be `"use client"`
- Placement: persistent nav header or sidebar visible on all protected routes
- `signOut({ callbackUrl: "/auth/login" })` — explicit redirect avoids landing on a protected page
- No server-side signOut needed — credentials + JWT strategy, cookie deletion is client-triggered

### loading.tsx Pattern
- File lives alongside `page.tsx` in the same route segment directory
- Must `export default` a React component (Server Component by default, can be Client)
- Skeleton should match real layout: same card heights, same grid columns, pulse animation via Tailwind `animate-pulse`
- Do NOT put data fetching logic in `loading.tsx` — it is purely presentational

### Mutation isPending
- `useTransition`: `const [isPending, startTransition] = useTransition()` — wrap fetch call in `startTransition(async () => { ... })`
- Server Actions: prefer `useFormStatus` for submit button inside `<form action={serverAction}>` — `const { pending } = useFormStatus()`
- Both approaches: `<button disabled={isPending}>` + visual indicator (spinner icon, opacity change, or text change to "Saving...")

### Python Pipeline Architecture
```
data-pipeline/
  config.py          # DATABASE_URL_UNPOOLED, SEASON constant, rate limit delay
  fetch.py           # get_season_game_ids(season) + get_play_by_play(game_id)
  transform.py       # filter_shot_events(events) → list of flat dicts
  load.py            # upsert_shots(conn, shots) using ON CONFLICT DO NOTHING
  pipeline.py        # main() orchestrator: walk games, fetch, transform, load, log
  requirements.txt   # requests, psycopg2-binary, tqdm
```

### NHL API Endpoints (MEDIUM confidence — unofficial reference)
- Schedule: `GET https://api-web.nhle.com/v1/schedule/{YYYY-MM-DD}` — returns games for that week
- Season schedule: `GET https://api-web.nhle.com/v1/club-schedule-season/{team}/{season}` (per team) or walk the full calendar
- Play-by-play: `GET https://api-web.nhle.com/v1/gamecenter/{gameId}/play-by-play`
- Shot event keys: `typeDescKey` in `["shot-on-goal", "goal", "missed-shot", "blocked-shot"]`
- No auth required; no published rate limit — treat as 1 req/sec maximum

### Nhl_shots Table (new, plain SQL migration)
```sql
CREATE TABLE IF NOT EXISTS nhl_shots (
    id SERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL,
    event_id INTEGER NOT NULL,
    season VARCHAR(8) NOT NULL,
    period INTEGER,
    time_in_period VARCHAR(10),
    shooter_name VARCHAR(100),
    team_abbrev VARCHAR(5),
    shot_type VARCHAR(50),
    x_coord FLOAT,
    y_coord FLOAT,
    shot_distance FLOAT,
    shot_angle FLOAT,
    is_goal BOOLEAN DEFAULT FALSE,
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (game_id, event_id)
);
```

---

## Sources

- [Next.js loading.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/loading) — HIGH confidence
- [Next.js Streaming guide](https://nextjs.org/docs/app/guides/streaming) — HIGH confidence
- [React useTransition](https://react.dev/reference/react/useTransition) — HIGH confidence
- [NHL API Reference (unofficial)](https://github.com/Zmalski/NHL-API-Reference) — MEDIUM confidence (community-maintained)
- [nhl-api-py PyPI](https://pypi.org/project/nhl-api-py/) — MEDIUM confidence (wrapper library that documents endpoints)
- [Idempotency in data ingestion pipelines](https://medium.com/@iamanjlikaur/ensuring-idempotency-in-data-ingestion-pipelines-33301cf917fb) — MEDIUM confidence
- [API rate limiting best practices 2026](https://www.getknit.dev/blog/10-best-practices-for-api-rate-limiting-and-throttling) — MEDIUM confidence
- [NextAuth signOut discussion](https://github.com/nextauthjs/next-auth/discussions/3996) — MEDIUM confidence (community issue thread)

---
*Feature research for: Hockey performance tracker v2.0 — UX polish + NHL pipeline*
*Researched: 2026-07-07*
