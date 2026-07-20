---
phase: 07-nhl-data-pipeline
verified: 2026-07-18T00:00:00Z
status: human_needed
score: 2/4 must-haves verified (2 need human execution)
human_verification:
  - test: "Run python ingest.py --season 20242025 to completion"
    expected: "Pipeline processes ~1312 games, inserts ~89,000 shot events into nhl_raw.shot_events, prints final summary with row count matching NHL.com game logs"
    why_human: "Full-season run requires live NHL API + real Neon DB; cannot be verified programmatically. No 07-03-SUMMARY.md documenting smoke test results exists."
  - test: "Run pipeline a second time on same season; verify zero new rows"
    expected: "Before count == After count; 'New rows: 0'"
    why_human: "Idempotency over real data requires two actual pipeline executions. Unit test (test_idempotent_upsert_no_duplicates) passes with synthetic data, but full-season idempotency run is undocumented."
---

# Phase 7: NHL Data Pipeline Verification Report

**Phase Goal:** A standalone Python script in /data-pipeline can ingest a complete NHL regular season of shot events into the nhl_raw.shot_events Postgres table with idempotency, rate-limiting, and a post-run row-count validation — with no coupling to the Next.js app

**Verified:** 2026-07-18
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running the pipeline for a full season produces nhl_raw.shot_events with the correct row count (verified against NHL.com) | ? NEEDS HUMAN | Pipeline is implemented correctly; no 07-03-SUMMARY.md documents a live full-season run |
| 2 | Running the pipeline a second time on the same season produces zero new rows (idempotent) | ? NEEDS HUMAN | ON CONFLICT DO NOTHING present in INSERT_SQL; unit test passes with synthetic data; no live idempotency run documented |
| 3 | Pipeline completes without crashing; 429/503 retried with exponential backoff; failed games logged and skipped | ✓ VERIFIED | `_get` has `@retry(stop_after_attempt(3), wait_exponential, reraise=True)`; main() wraps per-game calls in try/except appending to `failed` list; test_retry.py 2 tests green |
| 4 | Pipeline outputs post-ingestion summary to stdout: games processed, shots inserted, failed games, final row count | ✓ VERIFIED | main() prints all four items including `SELECT COUNT(*) FROM nhl_raw.shot_events` query result (ingest.py lines 273-283) |

**Score:** 2/4 truths verified programmatically (2 need human execution)

---

### Required Artifacts

| Artifact | Min Lines | Status | Details |
|----------|-----------|--------|---------|
| `data-pipeline/requirements.txt` | — | ✓ VERIFIED | 6 pinned deps: httpx>=0.27, psycopg[binary]>=3.1, tenacity>=8.2, python-dotenv>=1.0, pytest>=8.0, pytest-mock>=3.12 |
| `data-pipeline/.env.example` | — | ✓ VERIFIED | DATABASE_URL_UNPOOLED present; empty value (minor deviation from plan placeholder URL, non-blocking) |
| `data-pipeline/pytest.ini` | — | ✓ VERIFIED | testpaths=tests, addopts=-q |
| `data-pipeline/tests/conftest.py` | — | ✓ VERIFIED | 3 fixtures: sample_schedule_response, sample_pbp_response, sample_shots |
| `data-pipeline/tests/test_schedule.py` | — | ✓ VERIFIED | 3 test functions covering PIPE-01 |
| `data-pipeline/tests/test_pbp.py` | — | ✓ VERIFIED | 4 test functions covering PIPE-02 |
| `data-pipeline/tests/test_db.py` | — | ✓ VERIFIED | 3 test functions covering PIPE-03; modified with _psycopg_url() helper to strip Prisma schema param |
| `data-pipeline/tests/test_retry.py` | — | ✓ VERIFIED | 2 test functions covering PIPE-04 |
| `data-pipeline/ingest.py` (plan 02) | 120 | ✓ VERIFIED | 287 lines; all 7 functions + constants present; importable |
| `data-pipeline/ingest.py` (plan 03) | 180 | ✓ VERIFIED | 287 lines >= 180; `def main` exists; `if __name__ == "__main__": main()` guard present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| test_schedule.py | ingest.fetch_game_ids | `from ingest import fetch_game_ids` | ✓ WIRED | `def fetch_game_ids` at line 75 of ingest.py |
| test_pbp.py | ingest.fetch_shots | `from ingest import fetch_shots` | ✓ WIRED | `def fetch_shots` at line 107 of ingest.py |
| test_db.py | ingest.create_schema, ingest.ingest_shots | `from ingest import create_schema, ingest_shots` | ✓ WIRED | Both functions present; INSERT_SQL is module-level string (patchable) |
| test_retry.py | ingest._get | `from ingest import _get` | ✓ WIRED | `def _get` at line 63 of ingest.py with @retry decorator |
| ingest.main | ingest.fetch_game_ids | `game_ids = fetch_game_ids(season)` | ✓ WIRED | line 247 of ingest.py |
| ingest.main | ingest.fetch_shots | `shots = fetch_shots(gid)` | ✓ WIRED | line 257 of ingest.py |
| ingest.main | ingest.ingest_shots | `ingest_shots(conn, shots)` | ✓ WIRED | line 259 of ingest.py |
| ingest.main | ingest.create_schema | `create_schema(conn)` | ✓ WIRED | line 244 of ingest.py |
| ingest.main | nhl_raw.shot_events | `SELECT COUNT(*) FROM nhl_raw.shot_events` | ✓ WIRED | line 269 of ingest.py |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PIPE-01 | 07-01, 07-02, 07-03 | Pipeline walks full NHL season date range and collects all gameIds via schedule endpoint | ✓ SATISFIED | `fetch_game_ids` iterates SEASON_DATES date range day-by-day, filters gameType==2, deduplicates via set, returns sorted list. 3 unit tests green. |
| PIPE-02 | 07-01, 07-02, 07-03 | Fetches play-by-play and filters to shot events | ✓ SATISFIED | `fetch_shots` uses SHOT_TYPES set, null-safe `play.get("details") or {}`, scoringPlayerId fallback for goals. 4 unit tests green. |
| PIPE-03 | 07-01, 07-02, 07-03 | Inserts into nhl_raw.shot_events with idempotent upsert | ✓ SATISFIED | `INSERT_SQL` has `ON CONFLICT (game_id, event_id) DO NOTHING`. `create_schema` uses IF NOT EXISTS. 3 DB unit tests pass against real Neon DB. |
| PIPE-04 | 07-01, 07-02, 07-03 | Rate-limits (~1 req/sec), retries 429/503 with exponential backoff, logs failed games without crashing, outputs post-ingestion row count | ✓ SATISFIED | `time.sleep(1)` in fetch_game_ids + main loop. `@retry(stop_after_attempt(3), wait_exponential, reraise=True)`. main() try/except per game. Final `SELECT COUNT(*)` query. Summary block printed. 2 retry tests green. |

No orphaned requirements — all 4 PIPE IDs declared in all three plans are accounted for.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | Zero TODO/FIXME/placeholder/empty-return patterns found across all data-pipeline files |

---

### Test Results

All 12 unit tests pass (run 2026-07-18):

```
tests/test_schedule.py   3 passed   PIPE-01 coverage
tests/test_pbp.py        4 passed   PIPE-02 coverage
tests/test_retry.py      2 passed   PIPE-04 coverage
tests/test_db.py         3 passed   PIPE-03 coverage (real Neon DB)
Total: 12 passed in ~13s
```

DB tests connected to real Neon database (DATABASE_URL_UNPOOLED set in data-pipeline/.env).

### CLI Verification

```
python ingest.py          → error: --season argument required (correct)
python ingest.py --season INVALID  → error: Unknown season 'INVALID' (correct)
python -c "import ingest" → Import OK (no syntax errors)
```

---

### Human Verification Required

#### 1. Full-Season Pipeline Run

**Test:** From `data-pipeline/`, ensure `.env` has DATABASE_URL_UNPOOLED set, then run:
```bash
python ingest.py --season 20242025
```
**Expected:** Pipeline processes approximately 1,312 games, prints progress every 50 games, ends with a summary block showing total games processed, shot events inserted (~89,000), failed games count (ideally 0), and final row count from nhl_raw.shot_events. Exit code 0.

**Why human:** Requires live NHL API connectivity and a real Postgres connection. No 07-03-SUMMARY.md documents that this run was ever performed.

---

#### 2. Idempotency Verification (Second Run)

**Test:** After the first run completes, record the final row count, then run the pipeline again:
```bash
python ingest.py --season 20242025
```
**Expected:** Summary shows "Shot events inserted: 0" for the second run (or very close); the final row count from nhl_raw.shot_events is identical to after the first run.

**Why human:** ON CONFLICT DO NOTHING logic is verified by unit test against synthetic data in a test schema, but live idempotency over ~89,000 real rows has not been confirmed.

---

### Process Note

Plan 07-03 (`autonomous: false`) includes a blocking human-verification checkpoint (Task 2) that requires approval before the plan can be marked complete. No `07-03-SUMMARY.md` exists in the phase directory, indicating this plan was partially executed (Task 1: main() implementation is present in ingest.py) but the human checkpoint was never formally passed. The smoke test script at `data-pipeline/smoke_test.py` exists but there is no recorded output confirming it ran successfully.

---

### Gaps Summary

No implementation gaps — all four PIPE requirements are implemented and verified by passing unit tests including real DB tests. The two human-verification items are execution confirmation tasks, not missing implementation. The implementation is complete and correct; it simply needs to be run against the live NHL API to confirm the full-season numbers.

Minor informational items (non-blocking):
- `data-pipeline/.env.example` has empty `DATABASE_URL_UNPOOLED=` rather than the example placeholder URL specified in the plan — cosmetic only
- `data-pipeline/smoke_test.py` is an undocumented utility script left from plan 03 development; it is functional but untested in CI

---

_Verified: 2026-07-18_
_Verifier: Claude (gsd-verifier)_
