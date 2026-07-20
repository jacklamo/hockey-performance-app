---
phase: 07-nhl-data-pipeline
plan: "01"
subsystem: data-pipeline
tags: [python, pytest, tdd, nhl-api, wave-0, scaffold]
dependency_graph:
  requires: []
  provides: [data-pipeline/tests, PIPE-01-coverage, PIPE-02-coverage, PIPE-03-coverage, PIPE-04-coverage]
  affects: [07-02-PLAN, 07-03-PLAN]
tech_stack:
  added: [httpx>=0.27, psycopg[binary]>=3.1, tenacity>=8.2, python-dotenv>=1.0, pytest>=8.0, pytest-mock>=3.12]
  patterns: [TDD Wave 0 (tests before implementation), conftest fixtures, pytest.ini configuration]
key_files:
  created:
    - data-pipeline/requirements.txt
    - data-pipeline/.env.example
    - data-pipeline/pytest.ini
    - data-pipeline/README.md
    - data-pipeline/tests/__init__.py
    - data-pipeline/tests/conftest.py
    - data-pipeline/tests/test_schedule.py
    - data-pipeline/tests/test_pbp.py
    - data-pipeline/tests/test_db.py
    - data-pipeline/tests/test_retry.py
  modified: []
decisions:
  - "data-pipeline/.env gitignore coverage provided by existing .env* pattern (line 34) — no separate entry needed"
  - "12 test functions across 4 files (plan spec said 14 — a typo; artifact specs sum to 3+4+3+2=12)"
metrics:
  duration: "3 minutes"
  completed_date: "2026-07-18"
  tasks_completed: 2
  files_created: 10
---

# Phase 7 Plan 01: NHL Data Pipeline Scaffold + Wave 0 Tests Summary

Wave 0 test harness for the NHL data pipeline — 12 test stubs across 4 files covering PIPE-01 through PIPE-04, ready for implementation in plan 02.

## What Was Built

Created the complete `data-pipeline/` project scaffold with Python deps, pytest config, env template, documentation, and Wave 0 test stubs that define the implementation contract for plans 02 and 03.

## Files Created

| File | Purpose |
|------|---------|
| `data-pipeline/requirements.txt` | 6 pinned deps: httpx, psycopg[binary], tenacity, python-dotenv, pytest, pytest-mock |
| `data-pipeline/.env.example` | DATABASE_URL_UNPOOLED placeholder — safe to commit |
| `data-pipeline/pytest.ini` | testpaths=tests, addopts=-q |
| `data-pipeline/README.md` | Setup, run, test, and output documentation |
| `data-pipeline/tests/__init__.py` | Empty package marker |
| `data-pipeline/tests/conftest.py` | 3 fixtures: sample_schedule_response, sample_pbp_response, sample_shots |
| `data-pipeline/tests/test_schedule.py` | 3 stubs — PIPE-01 coverage |
| `data-pipeline/tests/test_pbp.py` | 4 stubs — PIPE-02 coverage |
| `data-pipeline/tests/test_db.py` | 3 stubs — PIPE-03 coverage |
| `data-pipeline/tests/test_retry.py` | 2 stubs — PIPE-04 coverage |

## Wave 0 Test Count

12 test functions across 4 test files (Wave 0 state: all produce ImportError on `ingest` until plan 02).

| File | Count | Requirements Covered |
|------|-------|---------------------|
| test_schedule.py | 3 | PIPE-01: schedule walk, gameType filter, deduplication |
| test_pbp.py | 4 | PIPE-02: shot extraction, goal fallback, null details, non-shot filter |
| test_db.py | 3 | PIPE-03: schema creation, insert, idempotent upsert |
| test_retry.py | 2 | PIPE-04: 429/503 triggers retry, 3-attempt exhaustion raises |

## Verification Results

- `python -m pytest tests/ --collect-only` produces ImportError on `ingest` only (expected Wave 0 state)
- `git check-ignore -v data-pipeline/.env` matches `.gitignore:34:.env*` (covered)
- `data-pipeline/.env.example` is tracked and committed
- `pip install -r requirements.txt` installs all 6 deps successfully

## Notes for Plan 02 Executor

The test files define the exact function signatures that `ingest.py` must export:

```python
from ingest import fetch_game_ids   # test_schedule.py
from ingest import fetch_shots      # test_pbp.py
from ingest import create_schema, ingest_shots  # test_db.py
from ingest import _get             # test_retry.py
```

Additional module-level constants the tests patch:
- `ingest.SEASON_DATES` — dict mapping season string to `(start_date, end_date)` tuple
- `ingest.INSERT_SQL` — SQL string containing `"nhl_raw.shot_events"` (test_db.py patches this)

## Deviations from Plan

### Minor: Test count discrepancy

The plan verification section states "14 collected items" but the plan artifact specs explicitly list 3+4+3+2=12 test functions. Implemented exactly 12 functions matching the detailed artifact specifications. The "14" in the verification section appears to be a typo in the plan.

### Auto-handled: .gitignore already covered

The plan instructed appending `data-pipeline/.env` to `.gitignore`. The existing `.env*` pattern on line 34 already covers this path (confirmed via `git check-ignore`). No duplicate entry was added.

## Self-Check: PASSED

Files exist:
- data-pipeline/requirements.txt: FOUND
- data-pipeline/.env.example: FOUND
- data-pipeline/pytest.ini: FOUND
- data-pipeline/README.md: FOUND
- data-pipeline/tests/__init__.py: FOUND
- data-pipeline/tests/conftest.py: FOUND
- data-pipeline/tests/test_schedule.py: FOUND
- data-pipeline/tests/test_pbp.py: FOUND
- data-pipeline/tests/test_db.py: FOUND
- data-pipeline/tests/test_retry.py: FOUND

Commits:
- b1121b8: chore(07-01): create data-pipeline project scaffold
- 49b35f5: test(07-01): add Wave 0 test stubs for PIPE-01 through PIPE-04
