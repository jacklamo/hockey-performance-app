---
phase: 07-nhl-data-pipeline
plan: "02"
subsystem: data-pipeline
tags: [python, pytest, tdd, nhl-api, ingest, psycopg, tenacity, httpx]
dependency_graph:
  requires: [07-01]
  provides: [data-pipeline/ingest.py, NHL_BASE, SHOT_TYPES, SEASON_DATES, _get, fetch_game_ids, fetch_shots, CREATE_DDL, INSERT_SQL, create_schema, ingest_shots]
  affects: [07-03-PLAN]
tech_stack:
  added: []
  patterns: [tenacity retry decorator, httpx GET wrapper, psycopg executemany, idempotent ON CONFLICT DO NOTHING]
key_files:
  created:
    - data-pipeline/ingest.py
  modified:
    - data-pipeline/tests/test_db.py
decisions:
  - "INSERT_SQL is module-level so test_db.py can patch ingest.INSERT_SQL to redirect to nhl_raw_test schema"
  - "_psycopg_url() helper strips Prisma-only schema= query param from DATABASE_URL_UNPOOLED before psycopg.connect()"
  - "player_names dict built from rosterSpots before play loop — O(1) lookup per play event"
  - "fetch_shots uses 'play.get(details) or {}' (not play['details']) to handle details=None without exception"
metrics:
  duration: "5 minutes"
  completed_date: "2026-07-18"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 7 Plan 02: NHL Ingest Core Implementation Summary

All 7 ingest functions + constants implemented in `data-pipeline/ingest.py` with 12/12 tests green — schedule walker, play-by-play shot extractor, tenacity retry wrapper, idempotent Postgres batch inserter.

## What Was Built

`data-pipeline/ingest.py` — 197 lines covering the complete Wave 0 contract from plan 01 test stubs. All 12 tests pass (9 API + 3 DB tests).

## Functions Implemented

| Function | Signature | Description |
|----------|-----------|-------------|
| `_is_retryable` | `(exc: BaseException) -> bool` | True for HTTPStatusError 429/5xx, ConnectError, TimeoutException |
| `_get` | `(url: str) -> dict` | httpx GET with tenacity retry (3 attempts, exponential backoff, reraise=True) |
| `fetch_game_ids` | `(season: str) -> list[int]` | Walks SEASON_DATES date range, filters gameType==2, deduplicates, returns sorted |
| `fetch_shots` | `(game_id: int) -> list[dict]` | Extracts SHOT_TYPES plays with null-safe details and scoringPlayerId fallback |
| `create_schema` | `(conn: psycopg.Connection) -> None` | Executes CREATE_DDL (idempotent schema + table) and commits |
| `ingest_shots` | `(conn: psycopg.Connection, shots: list) -> int` | executemany(INSERT_SQL, shots) + commit, returns len(shots) |

## Module-Level Constants

| Constant | Type | Value |
|----------|------|-------|
| `NHL_BASE` | str | `"https://api-web.nhle.com/v1"` |
| `SHOT_TYPES` | set | `{"shot-on-goal", "goal", "missed-shot", "blocked-shot"}` |
| `SEASON_DATES` | dict | `{"20242025": ("2024-10-04", "2025-04-17")}` |
| `CREATE_DDL` | str | Schema + table DDL with IF NOT EXISTS |
| `INSERT_SQL` | str | Named-param INSERT with ON CONFLICT (game_id, event_id) DO NOTHING |

## Test Results

```
12 passed in 13.22s
tests/test_db.py      3 passed  (PIPE-03: schema creation, insert, idempotent upsert)
tests/test_pbp.py     4 passed  (PIPE-02: shot extraction, goal fallback, null details, filter)
tests/test_retry.py   2 passed  (PIPE-04: 429 retry, 3-attempt exhaustion raises)
tests/test_schedule.py 3 passed (PIPE-01: schedule walk, gameType filter, deduplication)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma schema= query param breaks psycopg.connect()**

- **Found during:** Task 2 verification (test_db.py)
- **Issue:** `DATABASE_URL_UNPOOLED` in root `.env` includes `?schema=public&sslmode=require`. Prisma accepts `schema=` as its own routing parameter; psycopg3 raises `ProgrammingError: invalid URI query parameter: "schema"`.
- **Fix:** Added `_psycopg_url()` helper in `test_db.py` that strips the `schema` param using `urllib.parse` before passing the URL to `psycopg.connect()`. `sslmode=require` is preserved.
- **Files modified:** `data-pipeline/tests/test_db.py`
- **Commit:** d791d97

## Notes for Plan 03 Executor

Plan 03 adds `main()` to `ingest.py`. Key facts about the existing implementation:

1. `fetch_game_ids(season)` requires `season` to be a key in `SEASON_DATES` — add new seasons there.
2. `_get` is module-level and patched by tests as `ingest._get` — `main()` can call it indirectly via `fetch_game_ids`/`fetch_shots` without touching the decorator.
3. `ingest_shots` returns `len(shots)` (not actual inserted row count — ON CONFLICT DO NOTHING means count may be less on re-runs, but return value is always len(shots)).
4. `create_schema` must be called before `ingest_shots` to ensure the table exists.
5. The `time.sleep(1)` in `fetch_game_ids` means a full season walk (~185 days) takes ~3 minutes just for schedule fetching — expected.

## Self-Check: PASSED

Files exist:
- data-pipeline/ingest.py: FOUND

Commits:
- 0214131: feat(07-02): implement NHL API constants and functions in ingest.py
- d791d97: feat(07-02): add DB constants and functions (CREATE_DDL, INSERT_SQL, create_schema, ingest_shots)
