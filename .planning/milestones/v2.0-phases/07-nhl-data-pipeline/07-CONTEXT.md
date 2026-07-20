# Phase 7: NHL Data Pipeline - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

A standalone Python pipeline in `/data-pipeline` that ingests a full NHL regular season of shot events into `nhl_raw.shot_events` in Postgres. Idempotent, rate-limited, resilient to transient API failures. No coupling to the Next.js app. Post-ingestion row-count validation included. xG model training is deferred.

</domain>

<decisions>
## Implementation Decisions

### Shot Event Schema

`nhl_raw.shot_events` columns:
- `game_id` (INTEGER) — NHL game ID
- `event_id` (INTEGER) — event sequence number within the game
- `period` (SMALLINT) — period number
- `period_time` (VARCHAR) — time within period (e.g., "14:32")
- `event_type` (VARCHAR) — one of: shot-on-goal, goal, missed-shot, blocked-shot
- `shot_type` (VARCHAR) — wrist, slap, backhand, tip-in, etc.
- `x_coord` (SMALLINT) — x coordinate on the ice
- `y_coord` (SMALLINT) — y coordinate on the ice
- `shooter_id` (INTEGER) — NHL player ID of the shooter
- `shooter_name` (VARCHAR) — shooter's name (stored for convenience)
- `inserted_at` (TIMESTAMPTZ DEFAULT NOW()) — pipeline run timestamp

Primary key: `(game_id, event_id)` — enables idempotent upsert via `ON CONFLICT DO NOTHING`

Schema: `nhl_raw` (separate from public — prevents lock contention with live app tables)

No pre-computed distance/angle columns — derivable from x_coord/y_coord when needed for modeling. No goalie identity columns. No season_id column (derivable from game_id).

### Season Configuration

- Season specified as a CLI argument: `python ingest.py --season 20242025`
- NHL season format: YYYYYYYY (e.g., `20242025` for the 2024-25 season)
- First target season: **2024-25 (20242025)**
- Scope: regular season only (NHL gameType=2) — excludes preseason (gameType=1) and playoffs (gameType=3)
- Season date range (Oct through April) walked by querying the NHL schedule endpoint day by day to collect all gameIds

### Validation Output

- **Progress during run:** Periodic progress lines every N games (e.g., every 50 games): `[150/1312] 11% — 12,345 shots ingested so far`. Not silent, not per-game verbose.
- **Post-run summary block** (stdout at completion):
  ```
  === NHL Data Pipeline Complete ===
  Season:          20242025
  Games processed: 1312
  Shot events inserted: 89,421
  Failed games:    3 (game IDs: 2024020042, 2024020178, 2024020999)
  Final row count: 89,421 (from nhl_raw.shot_events)
  ```
- **Verification approach:** Manual spot-check — pick 2-3 games, compare shot counts against NHL.com game logs. No automated comparison script needed.

### Retry & Error Handling

- Rate limit: ~1 request/sec between API calls (sequential fetching — no concurrent requests)
- Retry on 429/503: exponential backoff via `tenacity` (3 retries before giving up on that game)
- Failed games: logged and skipped without halting the run; game IDs appear in the final summary
- DB connection: `DATABASE_URL_UNPOOLED` (direct connection, not PgBouncer pooled URL)

### Project Structure

```
/data-pipeline/
  ingest.py         # single main script — CLI entrypoint
  requirements.txt  # deps: httpx, psycopg[binary], tenacity, python-dotenv
  .env              # gitignored — DATABASE_URL_UNPOOLED
  .env.example      # committed — shows required vars
  README.md         # usage: python ingest.py --season 20242025
```

- Single script (not a package) — pipeline is ~300 lines; module splitting would be premature
- **HTTP library:** `httpx` (modern, cleaner API than requests)
- **DB library:** `psycopg` (psycopg3) — raw SQL, no ORM (consistent with existing project decision: "raw psycopg3 is correct weight")
- **Retry library:** `tenacity`
- **Config:** `.env` file loaded by `python-dotenv`; `DATABASE_URL_UNPOOLED` is the only required var

### Claude's Discretion

- Exact progress interval (every 50 games, every 100, etc.)
- Failed game ID formatting in the summary
- SQL DDL for schema/table creation (idempotent `CREATE SCHEMA IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS`)
- Exact tenacity retry configuration (wait multiplier, max attempts)
- Whether to print a schema creation notice on first run

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `DATABASE_URL_UNPOOLED`: Already in Vercel env and referenced in `schema.prisma` as `directUrl`. Pipeline reuses the same var — copy once from Vercel dashboard into `/data-pipeline/.env`.
- `prisma/schema.prisma`: Shows the `nhl_raw` schema decision is already locked; pipeline creates its own DDL independently (no Prisma involvement — Python writes raw SQL).

### Established Patterns

- **No coupling to Next.js app**: Pipeline runs in `/data-pipeline` as a completely standalone Python process. It connects to the same Neon Postgres database but writes to `nhl_raw` schema, not `public`.
- **Sequential fetching pattern**: Already decided in project decisions — ~1 req/sec, no concurrent requests, tenacity for backoff.
- **Idempotent upsert pattern**: `INSERT INTO ... ON CONFLICT (game_id, event_id) DO NOTHING` — decided before this discussion.

### Integration Points

- **Database**: Same Neon Postgres instance. `DATABASE_URL_UNPOOLED` connects directly (bypasses PgBouncer). Pipeline creates `nhl_raw` schema and `shot_events` table on first run.
- **No app code changes**: Phase 7 adds zero changes to the Next.js app. It's a standalone directory alongside the app.

</code_context>

<specifics>
## Specific Ideas

- No specific design references — standard Python CLI script style
- Schema column choices (x/y only, no pre-computed distance/angle) reflect intent to do xG computation outside the pipeline, not inside it
- The `.env.example` file is important: it documents required vars for future use (GitHub Actions, another developer, etc.)

</specifics>

<deferred>
## Deferred Ideas

- **PIPE-05**: Checkpoint/resume manifest (`pipeline_runs` table) — already in REQUIREMENTS.md as a future requirement
- **PIPE-06**: Scheduled pipeline execution via GitHub Actions cron — future requirement
- **PIPE-07**: xG model training and scoring on ingested data — the whole point of the pipeline, but a separate future phase
- **Multi-season loop** (`--start-season` / `--end-season` flags) — suggested during discussion; deferred to keep v1 scope clean

</deferred>

---

*Phase: 07-nhl-data-pipeline*
*Context gathered: 2026-07-18*
