---
phase: 07-nhl-data-pipeline
plan: "03"
subsystem: data-pipeline
tags: [python, nhl-api, psycopg, argparse, cli, idempotency]
dependency_graph:
  requires: [07-01, 07-02]
  provides: [complete-ingest-cli, live-api-verified, idempotency-confirmed]
  affects: [nhl_raw.shot_events]
tech_stack:
  added: [urllib.parse]
  patterns: [argparse-cli, game-loop-with-rate-limiting, failed-game-tracking, post-run-summary]
key_files:
  modified: [data-pipeline/ingest.py]
decisions:
  - "_psycopg_url() strips schema= Prisma param before psycopg.connect() — Prisma accepts it, psycopg3 rejects it as invalid URI parameter"
  - "progress reporting every 50 games (not every game) to keep stdout readable during full 1,312-game season run"
  - "failed-game tracking: single game failure logs [SKIP] and continues — does not halt the run"
metrics:
  duration: "15m"
  completed: "2026-07-18"
  tasks: 2
  files: 1
---

# Phase 07 Plan 03: CLI Wiring and Smoke Test Summary

**One-liner:** Complete `ingest.py` CLI with argparse, game loop, progress reporting, and post-run summary — verified against live NHL API with 19 games and 2,352 shots ingested and idempotency confirmed.

## What Was Built

`data-pipeline/ingest.py` is now a complete, runnable CLI script. Plan 02 implemented all the core helper functions; this plan wired them together into a `main()` entry point and confirmed the full stack works end-to-end against the real NHL API and Neon DB.

**Functions in final ingest.py (287 lines, 8 functions):**
- `_psycopg_url(url)` — strips Prisma-only `schema=` query param before passing to psycopg
- `_is_retryable(exc)` — classifies transient HTTP errors for tenacity retry
- `_get(url)` — tenacity-decorated HTTP GET (3 attempts, exponential backoff)
- `fetch_game_ids(season)` — walks NHL schedule API day-by-day, returns sorted game IDs
- `fetch_shots(game_id)` — fetches play-by-play, extracts shot events with player names
- `create_schema(conn)` — idempotent DDL: creates nhl_raw schema + shot_events table
- `ingest_shots(conn, shots)` — bulk insert with ON CONFLICT DO NOTHING
- `main()` — argparse CLI, game loop, progress, summary, error handling

## Smoke Test Results (Oct 4, 2024)

| Metric | Value |
| ------ | ----- |
| Games found for 2024-10-04 | 19 |
| Shot events ingested (first run) | 2,352 |
| Shot events inserted (second run) | 0 (idempotency confirmed) |
| rosterSpots.firstName structure | Nested dict with `default` key (code assumption correct) |
| Database | nhl_raw.shot_events in Neon (direct/unpooled connection) |

## CLI Behavior Verified

- `python ingest.py` (no args) → argparse usage error mentioning `--season` (exit code 2)
- `python ingest.py --season INVALID` → "Unknown season 'INVALID'. Supported seasons: ['20242025']" (exit code 2)
- `python ingest.py --season 20242025` → connects, creates schema, walks schedule, ingests shots, prints summary

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written for Task 1.

### Checkpoint-approved Fix

**[Rule 1 - Bug] _psycopg_url() helper to strip Prisma schema= param**
- **Found during:** Task 2 (smoke test, user applied fix during human verification)
- **Issue:** DATABASE_URL_UNPOOLED from Neon Dashboard contains `?schema=public` Prisma query param. psycopg3 rejects it as an invalid URI parameter; Prisma accepts it silently.
- **Fix:** Added `_psycopg_url()` using `urllib.parse` to strip `schema=` before calling `psycopg.connect()`. Wired into `main()`.
- **Files modified:** data-pipeline/ingest.py
- **Commit:** 70162c4

## Full-Season Run Instructions

```bash
cd data-pipeline
cp .env.example .env
# Edit .env: paste DATABASE_URL_UNPOOLED from Neon Dashboard → Connection Details → Direct connection

python ingest.py --season 20242025
# Walks 2024-10-04 through 2025-04-17
# Estimated ~1,312 regular-season games × ~1s/game = ~22 minutes
# Progress printed every 50 games
# Safe to re-run (ON CONFLICT DO NOTHING)
```

## Self-Check: PASSED

- FOUND: .planning/phases/07-nhl-data-pipeline/07-03-SUMMARY.md
- FOUND: commit 047cf16 (feat: implement main() CLI entry point)
- FOUND: commit 70162c4 (fix: add _psycopg_url() helper)
- FOUND: data-pipeline/ingest.py (287 lines, 8 functions)
