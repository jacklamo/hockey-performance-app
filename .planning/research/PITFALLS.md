# Pitfalls Research

**Domain:** Next.js App Router UX polish (loading states, logout) + Python NHL API ingestion pipeline
**Researched:** 2026-07-07
**Confidence:** MEDIUM — Next.js pitfalls HIGH (official docs + community GitHub issues); NHL API pitfalls MEDIUM (unofficial docs + community wrappers; no official rate-limit documentation exists)

---

## Critical Pitfalls

### Pitfall 1: loading.tsx Does Not Re-Trigger on Same-Segment Navigation

**What goes wrong:**
When navigating between two pages in the same route segment (e.g., `/games/1` → `/games/2`), `loading.tsx` does not fire again. React reuses the component instance because the component type hasn't changed, so Suspense never re-suspends. The old content is immediately replaced with the new content with no loading skeleton shown. This is a documented Next.js bug/behavior (GitHub issue #53543, #73474).

**Why it happens:**
`loading.tsx` wraps the segment in a single Suspense boundary at route mount time. On subsequent navigations within the same segment type, React's reconciler does not unmount and remount — it diffs. No new suspension means no fallback.

**How to avoid:**
Add a `key` prop to Suspense boundaries that changes with the route parameter. On pages that need per-ID loading skeletons, use a manual `<Suspense key={gameId}>` wrapper around the data-fetching child rather than relying solely on `loading.tsx`.

```tsx
// page.tsx
<Suspense key={params.id} fallback={<GameSkeleton />}>
  <GameDetail id={params.id} />
</Suspense>
```

**Warning signs:**
No skeleton appears when clicking between `/games/1` and `/games/2` links. Content swaps immediately or shows stale data briefly. Reported user complaints of "jarring" transitions between game detail pages.

**Phase to address:** Phase 1 (loading states) — address when wiring up per-game loading skeletons.

---

### Pitfall 2: Placing loading.tsx Suspense Boundary Too High Blocks All Content

**What goes wrong:**
A single `loading.tsx` at the layout level wraps the entire page content in one Suspense boundary. The page shows nothing until every async data fetch completes — including slow ones. The app appears frozen. This negates the streaming benefit of the App Router.

**Why it happens:**
`loading.tsx` at a route segment wraps `page.tsx` (and nested layouts below it) but not the segment's own layout. Developers assume one file covers all cases. In practice, if `page.tsx` has multiple independent fetches, they block each other.

**How to avoid:**
Isolate each independent data-fetching component and wrap it in its own `<Suspense fallback={<Skeleton />}>`. The top-level `loading.tsx` can show a page-level skeleton for first load, but individual sections should have their own boundaries. On the dashboard, for example: summary cards, chart, and insights should each suspend independently.

**Warning signs:**
Dashboard shows blank/spinner for 2–3 seconds before anything appears. Removing one slow fetch makes the whole page load faster — a sign all fetches are coupled in one Suspense boundary.

**Phase to address:** Phase 1 (loading states) — architecture decision up front.

---

### Pitfall 3: useSearchParams() Without Suspense Causes Full CSR Bailout

**What goes wrong:**
Any component that calls `useSearchParams()` without being wrapped in a Suspense boundary causes Next.js to bail out of static rendering for the entire route and fall back to full client-side rendering. This generates a build warning (`Missing Suspense boundary with useSearchParams`) and silently degrades performance — the route loses streaming.

**Why it happens:**
`useSearchParams()` reads dynamic data at render time. Without a Suspense boundary, Next.js cannot safely split the page into static and dynamic parts.

**How to avoid:**
Always wrap the smallest component that calls `useSearchParams()` in `<Suspense>`, not the parent route. Extract search-param-reading logic into a small leaf component.

**Warning signs:**
Next.js build output warns: `Missing Suspense boundary with useSearchParams`. Page load feels slower than expected on Vercel despite static content above the fold.

**Phase to address:** Phase 1 (loading states) — check all existing components using `useSearchParams` during loading state audit.

---

### Pitfall 4: NextAuth signOut Does Not Clear Session on Protected Routes Without Full Redirect

**What goes wrong:**
Calling `signOut()` from a client component on a protected route (e.g., `/dashboard`) without specifying `callbackUrl` results in the middleware immediately redirecting the user back to the login page but with a `callbackUrl` query param pointing back to the protected route. After login, they land back on the dashboard — which looks correct — but if the session is partially stale (JWT not yet expired) the user sees a flash of authenticated content before the new session hydrates.

**Why it happens:**
NextAuth's credentials provider uses JWT sessions by default. JWT sessions cannot be server-side invalidated before expiry. When `signOut()` is called, the JWT cookie is cleared client-side, but any in-flight server request that still has the cookie in its request headers may succeed before the cookie is gone. On Next.js App Router with RSC, this creates a brief window.

**How to avoid:**
Call `signOut({ callbackUrl: '/login' })` explicitly. Do not rely on default redirect behavior. On the server, set `maxAge` for the JWT session to a short window (e.g., 3600s) so stale tokens expire quickly. For credentials provider, this is the correct and sufficient approach — no server-side session revocation is possible without switching to database sessions.

```ts
// Logout button
await signOut({ callbackUrl: '/login' })
```

**Warning signs:**
After clicking logout, browser URL goes to `/login?callbackUrl=%2Fdashboard`. User sees protected page content flash before redirect completes. Middleware logs show authenticated requests arriving after client-side signOut was called.

**Phase to address:** Phase 1 (logout) — wire callbackUrl explicitly and test the redirect chain end-to-end.

---

### Pitfall 5: NEXTAUTH_URL Missing in Production Causes signOut Redirect to Localhost

**What goes wrong:**
`signOut()` redirect goes to `http://localhost:3000/login` instead of the production domain. This silently fails in production — users are redirected to a URL that doesn't resolve, or the browser drops them at a blank page.

**Why it happens:**
NextAuth uses `NEXTAUTH_URL` as the base for all redirect URLs. If the environment variable is missing or misconfigured in Vercel, Next.js falls back to inferring the host — which can be `localhost` in server-side contexts on some Vercel build configurations.

**How to avoid:**
Confirm `NEXTAUTH_URL` is set in Vercel dashboard environment variables (all environments: Production, Preview, Development). For credentials + JWT sessions on Vercel, also set `NEXTAUTH_SECRET`. Both must be present. Verify in post-deploy smoke test by actually clicking logout from the production URL.

**Warning signs:**
After deploy, logout redirects to localhost or a 404. NextAuth logs (visible in Vercel function logs) show "url does not match base url" errors.

**Phase to address:** Phase 1 (logout) — verification step after wiring signOut.

---

### Pitfall 6: NHL API Has No Official Rate Limit Documentation — Silent 429s Corrupt Ingestion

**What goes wrong:**
The NHL API (`api-web.nhle.com`) is undocumented and has no published rate limits. During bulk ingestion of a full season (~1,312 games × multiple endpoints), unthrottled requests will eventually receive 429 responses. If the pipeline doesn't handle 429 explicitly, it either crashes mid-season (load partial data) or silently skips games (no error raised, just empty records written to Postgres).

**Why it happens:**
Community wrappers (nhl-api-py, Zmalski/NHL-API-Reference) confirm no rate limit documentation exists. The API is designed for NHL internal broadcast use, not developer bulk ingestion. Without a Retry-After header in responses, naive retry logic uses fixed sleep which may not be enough.

**How to avoid:**
Implement exponential backoff with jitter on all requests. Default to 0.5–1s sleep between requests during normal operation. On any non-2xx response, retry with backoff: `sleep(2**attempt + random())`. Cap at 3 retries then write the game ID to a `failed_games.log` for manual rerun. Never silently discard failures.

```python
import time, random, requests

def fetch_with_backoff(url, max_retries=3):
    for attempt in range(max_retries):
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 429:
            wait = 2 ** attempt + random.uniform(0, 1)
            time.sleep(wait)
        else:
            resp.raise_for_status()
    raise RuntimeError(f"Failed after {max_retries} retries: {url}")
```

**Warning signs:**
Postgres shot_events table row count is lower than expected for known games. Pipeline completes without error but spot-check shows missing game IDs. `requests` throws `ConnectionError` mid-run without retry logic catching it.

**Phase to address:** Phase 2 (NHL pipeline) — implement before any bulk ingestion run.

---

### Pitfall 7: NHL API play-by-play Schema Has Nullable/Missing Fields That Shift Between Seasons

**What goes wrong:**
Shot event fields like `xCoord`, `yCoord`, `shotType`, `shootingPlayerId`, and `goalieInNetId` are not consistently present across all games. Older seasons (2021-22) may be missing fields that 2023-24 games have. A pipeline that assumes all fields are always present will crash on `KeyError` or write `None` to NOT NULL columns.

**Why it happens:**
The NHL API is undocumented and internally versioned. The NHL has expanded shot event detail across seasons (six new shot types added in 2022-23, nine missed shot descriptors in 2023-24). Older game data was not retroactively updated. The play-by-play endpoint at `/v1/gamecenter/{game-id}/play-by-play` returns whatever the NHL stored at the time.

**How to avoid:**
Use `.get()` with defaults for all shot event field extraction. Define the schema with nullable columns for optional fields. Never use `event['xCoord']` — always use `event.get('xCoord')`. Write a schema validation step that logs warnings (not errors) for missing optional fields so the pipeline continues.

```python
shot = {
    'game_id': game_id,
    'x_coord': event.get('xCoord'),       # nullable
    'y_coord': event.get('yCoord'),       # nullable
    'shot_type': event.get('shotType'),   # nullable
    'shooter_id': event.get('shootingPlayerId'),  # nullable
}
```

**Warning signs:**
Pipeline crashes with `KeyError` on a specific game ID. Row count in `shot_events` drops significantly for certain date ranges. Spot-check of event fields shows `null` values for coordinates on older seasons.

**Phase to address:** Phase 2 (NHL pipeline) — schema design and extraction logic.

---

### Pitfall 8: No Idempotency on Ingestion Causes Duplicate Rows on Re-run

**What goes wrong:**
Running the ingestion pipeline twice — due to a crash mid-run, or re-running to pick up missed games — inserts duplicate shot event rows. Aggregates like shot totals and xG models built on top of the table are silently doubled for affected games.

**Why it happens:**
Without a unique constraint on `(game_id, event_id)` and `INSERT ... ON CONFLICT DO NOTHING`, every re-run appends rather than upserts. Pipelines are commonly re-run: partial failures, season updates, backfills.

**How to avoid:**
Add a unique constraint on `(game_id, event_id)` in the Postgres schema. Use `INSERT INTO shot_events (...) VALUES (...) ON CONFLICT (game_id, event_id) DO NOTHING` (or DO UPDATE for fields that can change). This makes every re-run safe and idempotent.

```sql
CREATE UNIQUE INDEX shot_events_game_event_idx 
ON shot_events (game_id, event_id);
```

```python
cursor.execute("""
    INSERT INTO shot_events (game_id, event_id, ...)
    VALUES (%s, %s, ...)
    ON CONFLICT (game_id, event_id) DO NOTHING
""", row)
```

**Warning signs:**
Row count in `shot_events` grows proportionally each re-run rather than staying stable. Post-ingestion validation shows games with 2× or 3× expected shot counts.

**Phase to address:** Phase 2 (NHL pipeline) — schema design, before first ingestion run.

---

### Pitfall 9: Shared Postgres Schema Risks Corrupting Application Data During Pipeline Runs

**What goes wrong:**
The NHL pipeline writes to the same Postgres database as the Next.js application. A mis-targeted DELETE, schema migration, or transaction rollback during pipeline development corrupts or removes user game data. Even without bugs, a long-running pipeline transaction can hold locks that block the application's connection pool.

**Why it happens:**
Neon Postgres on Vercel Marketplace provisions a single database. Developers use `DATABASE_URL` for both the pipeline and the app because it's the only connection string available.

**How to avoid:**
Isolate pipeline tables in a dedicated Postgres schema (e.g., `nhl_raw` or `pipeline`). Application tables remain in `public`. Use `SET search_path TO nhl_raw` in pipeline sessions. This provides namespace isolation without requiring a second database. Additionally, use `DATABASE_URL_UNPOOLED` (direct connection) for the pipeline to avoid Neon's PgBouncer connection limits during bulk inserts.

```python
# Pipeline connection — always set schema explicitly
conn.execute("SET search_path TO nhl_raw")
```

**Warning signs:**
Pipeline script uses unqualified table names (`shot_events`) that could collide with future application tables. Application 500 errors spike during pipeline runs (lock contention). Pipeline accidentally issues `DROP TABLE` or `TRUNCATE` against an unqualified table name that resolves to an application table.

**Phase to address:** Phase 2 (NHL pipeline) — database design step before any writes.

---

### Pitfall 10: Partial Season Ingestion Leaves Invisible Gaps With No Manifest

**What goes wrong:**
The pipeline ingests games 1–500 then crashes. On restart, there's no record of which games were successfully processed. The developer either re-runs everything (slow, creates duplicates without idempotency) or manually inspects the database to find the gap. Either way, reporting built on the data gives wrong counts.

**Why it happens:**
Pipelines are written as simple loops without checkpointing. The assumption is "it'll work all the way through." At 1,300+ games with network calls, partial failures are nearly certain.

**How to avoid:**
Maintain a `pipeline_runs` table that records `(game_id, status, ingested_at)` for every attempted game. On re-run, query this table to skip already-completed games. On failure, log the game ID and error to `pipeline_runs` with `status = 'failed'`. This provides a manifest that makes gaps visible and re-runs safe.

```sql
CREATE TABLE nhl_raw.pipeline_runs (
    game_id    BIGINT PRIMARY KEY,
    status     TEXT NOT NULL,  -- 'success' | 'failed' | 'skipped'
    error_msg  TEXT,
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Warning signs:**
No way to answer "which games are in the database?" without a full table scan and cross-reference against schedule. Re-runs always process all games regardless of prior completion. No log output distinguishing "skipped (already done)" from "ingested (new)".

**Phase to address:** Phase 2 (NHL pipeline) — implement before first full-season run.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single `loading.tsx` per route, no per-section Suspense | Fast to implement | Entire page blocks on slowest fetch; poor perceived performance | Never — granular Suspense is a 15-minute refactor |
| `signOut()` with no explicit `callbackUrl` | One less argument | Broken redirect in production if `NEXTAUTH_URL` is misconfigured | Never — always specify callbackUrl |
| `event['field']` instead of `event.get('field')` in pipeline | Cleaner syntax | Crashes on any game with missing optional field | Never — NHL data is irregular |
| Hardcoded `time.sleep(1)` instead of exponential backoff | Simple | Silent pipeline death on 429 bursts | Only for local dev single-game tests |
| Pipeline writes to `public` schema alongside app tables | No extra setup | Namespace collision risk; lock contention risk | Never — schema isolation is a one-line change |
| No `pipeline_runs` manifest table | Simpler pipeline | Impossible to safely re-run or audit gaps | Only for a one-shot throwaway script, not production |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| NextAuth signOut + App Router | Call `signOut()` without `callbackUrl`; rely on default redirect | `signOut({ callbackUrl: '/login' })` — always explicit |
| NextAuth + Vercel deployment | Forget to set `NEXTAUTH_URL` in Vercel dashboard | Set `NEXTAUTH_URL=https://your-domain.vercel.app` in all Vercel environments before first deploy |
| NHL API bulk fetch | Unthrottled loop over all game IDs | 0.5–1s sleep between requests; exponential backoff on non-200 |
| NHL API + Neon Postgres | Use pooled `DATABASE_URL` for bulk inserts | Use `DATABASE_URL_UNPOOLED` (direct) for pipeline; pooled for application |
| loading.tsx + dynamic routes | Rely on `loading.tsx` alone for per-ID skeleton | Add `<Suspense key={id}>` wrapper in page.tsx for same-segment navigation |
| Suspense + useSearchParams | Use `useSearchParams()` without Suspense wrapper | Wrap smallest consuming component in `<Suspense>` to preserve static generation |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Waterfall fetches in a single Server Component | Dashboard loads in serial: cards, then chart, then insights | Break into parallel fetch components each wrapped in Suspense | Immediately visible at page load; gets worse as data grows |
| NHL pipeline without connection pooling limits | Neon rejects connections; `too many clients` error | Use direct (`DATABASE_URL_UNPOOLED`) connection, single connection object, batch commits | Neon free tier: ~20 max connections |
| Ingesting all shot events in one transaction | Large transaction holds lock; Neon may timeout or kill long transactions | Commit per game (not per season) to keep transactions short | Free tier Neon: transactions > 30s may be killed |
| Fetching entire season schedule upfront into memory | `MemoryError` or very slow startup | Stream game IDs with a generator; process lazily | ~1,300 game objects; manageable, but wasteful |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging `DATABASE_URL` in pipeline output | Connection string with credentials exposed in logs/stdout | Never log env vars; use `os.environ.get()` and only log sanitized connection metadata |
| Running pipeline with app's Prisma credentials | Full schema access during pipeline run; mis-targeted writes possible | Ideally use a separate Postgres role with INSERT-only on `nhl_raw` schema; at minimum, set search_path |
| Exposing pipeline as a Next.js API route | No auth required; anyone can trigger bulk NHL ingestion | Pipeline is a standalone Python script, not an API route — keep it out of the Next.js app |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state on signOut button while redirect is in-flight | User double-clicks; signOut fires twice; confusing redirect behavior | Disable logout button immediately on click; show spinner for 300ms before redirect completes |
| Loading skeleton appears and disappears in < 100ms (flash) | Jarring flicker worse than no skeleton | Use a minimum display time of ~150ms for skeletons or add CSS opacity transition |
| Loading skeleton with wrong dimensions for content | Layout shift when real content loads (bad CLS score) | Skeleton must match exact height/column count of the real component it replaces |
| No empty state shown after loading completes with 0 results | User sees a blank white area — looks broken | Every component with a Suspense boundary needs both a loading fallback AND an empty state |

---

## "Looks Done But Isn't" Checklist

- [ ] **Logout button:** Fires `signOut({ callbackUrl: '/login' })` — verify redirect goes to `/login`, not `/login?callbackUrl=...` or localhost
- [ ] **Loading states:** Verify `loading.tsx` triggers on first nav AND that `<Suspense key={id}>` triggers on same-segment nav (e.g., game 1 → game 2)
- [ ] **Suspense boundaries:** Every async Server Component is wrapped in its own `<Suspense>` — not one per page — verify by checking how many independent skeletons appear during load
- [ ] **NHL pipeline idempotency:** Run ingestion for the same 10 games twice — verify row count does not change on second run
- [ ] **NHL pipeline manifest:** After a simulated mid-run crash, re-run and verify only un-ingested games are processed (check `pipeline_runs` table)
- [ ] **Schema isolation:** Confirm `shot_events` and `pipeline_runs` live in `nhl_raw` schema, not `public` — run `\dn` in psql and verify
- [ ] **Spot-check validation:** After full ingestion, compare row count for a known game against NHL.com game recap — shot counts must match ±1
- [ ] **NEXTAUTH_URL in Vercel:** Confirm env var is set in Production environment — test by clicking logout from the production URL (not localhost)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Pipeline ran without idempotency — duplicate rows | MEDIUM | `TRUNCATE nhl_raw.shot_events; DELETE FROM nhl_raw.pipeline_runs;` then re-run with ON CONFLICT in place |
| Pipeline loaded data into `public` schema (wrong schema) | HIGH | Drop misplaced tables, re-run with correct search_path; audit for collisions with app tables |
| loading.tsx shows no skeleton on same-segment nav | LOW | Add `key={params.id}` to Suspense wrapper in page.tsx — 10-minute fix |
| signOut redirects to localhost in production | LOW | Add/correct `NEXTAUTH_URL` in Vercel dashboard; redeploy |
| NHL API fields missing — pipeline crashed | LOW | Switch all field access to `.get()` with defaults; re-run (idempotency prevents duplicates) |
| Partial season ingestion with no manifest | MEDIUM | Query `shot_events` for distinct game_ids, diff against schedule, re-ingest missing games |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| loading.tsx doesn't re-trigger on same-segment nav | Phase 1 — loading states | Click between `/games/1` and `/games/2`; skeleton must appear each time |
| Single Suspense boundary blocks whole page | Phase 1 — loading states | Dashboard must show partial content while any one section still loads |
| useSearchParams without Suspense causes CSR bailout | Phase 1 — loading states | `next build` output must have zero "Missing Suspense boundary" warnings |
| signOut missing callbackUrl | Phase 1 — logout | Click logout from `/dashboard`; confirm redirect is `/login` with no query params |
| NEXTAUTH_URL missing in production | Phase 1 — logout | Post-deploy smoke test: click logout from production URL |
| NHL API 429 without backoff | Phase 2 — NHL pipeline | Run pipeline; check logs for retry messages on any 429; no silent skips |
| NHL API nullable fields crash pipeline | Phase 2 — NHL pipeline | Run against game from 2021-22 season; pipeline must complete without KeyError |
| No idempotency on ingestion | Phase 2 — NHL pipeline | Run twice; row count in `shot_events` must be identical both times |
| Shared schema corruption risk | Phase 2 — NHL pipeline | psql `\dn` confirms all pipeline tables in `nhl_raw` schema |
| No ingestion manifest | Phase 2 — NHL pipeline | Simulate crash at game 50; re-run; logs show "skipped: 50 games already complete" |

---

## Sources

- Next.js official docs: [loading.js conventions](https://nextjs.org/docs/app/api-reference/file-conventions/loading) — HIGH confidence
- Next.js GitHub issue #53543: [Updating search params does not trigger Suspense fallback or loading.tsx](https://github.com/vercel/next.js/issues/53543) — HIGH confidence (official repo)
- Next.js GitHub issue #73474: [loading.tsx and Suspense do not work on second page load](https://github.com/vercel/next.js/issues/73474) — HIGH confidence (official repo)
- Next.js official docs: [Missing Suspense with useSearchParams](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout) — HIGH confidence
- NextAuth.js official docs: [Client API — signOut](https://next-auth.js.org/getting-started/client) — HIGH confidence
- NextAuth.js GitHub discussion #8686: [Redirect to home page on signOut](https://github.com/nextauthjs/next-auth/discussions/8686) — MEDIUM confidence
- NextAuth.js GitHub issue #7183: [SignIn and SignOut redirect not working](https://github.com/nextauthjs/next-auth/issues/7183) — MEDIUM confidence
- Zmalski/NHL-API-Reference: [Unofficial NHL API endpoint reference](https://github.com/Zmalski/NHL-API-Reference) — MEDIUM confidence (community-maintained, no rate limit docs)
- nhl-api-py: [Python NHL API wrapper](https://github.com/coreyjs/nhl-api-py) — MEDIUM confidence
- Airbyte: [Idempotency in data pipelines](https://airbyte.com/data-engineering-resources/idempotency-in-data-pipelines) — MEDIUM confidence
- PostgreSQL docs implicit in ON CONFLICT pattern — HIGH confidence
- upsun.com: [Avoid common mistakes with Next.js App Router](https://upsun.com/blog/avoid-common-mistakes-with-next-js-app-router/) — MEDIUM confidence

---
*Pitfalls research for: Next.js loading states + logout + Python NHL API ingestion pipeline*
*Researched: 2026-07-07*
