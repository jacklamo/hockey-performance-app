---
phase: 7
slug: nhl-data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-18
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x |
| **Config file** | `data-pipeline/pytest.ini` (Wave 0 creates) |
| **Quick run command** | `cd data-pipeline && python -m pytest tests/ -x -q` |
| **Full suite command** | `cd data-pipeline && python -m pytest tests/ -v` |
| **Estimated runtime** | ~5 seconds (unit tests only — no live API calls) |

---

## Sampling Rate

- **After every task commit:** Run `cd data-pipeline && python -m pytest tests/ -x -q`
- **After every plan wave:** Run `cd data-pipeline && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | PIPE-01 | unit | `pytest tests/test_schedule.py -x -q` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | PIPE-02 | unit | `pytest tests/test_parser.py -x -q` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 1 | PIPE-03 | unit | `pytest tests/test_db.py -x -q` | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 1 | PIPE-03 | unit | `pytest tests/test_db.py::test_idempotent_upsert -x -q` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 2 | PIPE-04 | unit | `pytest tests/test_retry.py -x -q` | ❌ W0 | ⬜ pending |
| 7-03-02 | 03 | 2 | PIPE-04 | integration | manual (live API) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `data-pipeline/tests/__init__.py` — empty, marks tests as package
- [ ] `data-pipeline/tests/conftest.py` — shared fixtures (mock API responses, in-memory DB)
- [ ] `data-pipeline/tests/test_schedule.py` — stubs for PIPE-01 (schedule walk, gameId collection, gameType filter)
- [ ] `data-pipeline/tests/test_parser.py` — stubs for PIPE-02 (play-by-play parsing, shot event filtering, shooter resolution)
- [ ] `data-pipeline/tests/test_db.py` — stubs for PIPE-03 (schema creation, insert, idempotent upsert)
- [ ] `data-pipeline/tests/test_retry.py` — stubs for PIPE-04 (tenacity retry on 429/503, failed-game logging)
- [ ] `data-pipeline/pytest.ini` — test config pointing to `data-pipeline/tests/`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live API connectivity + field names | PIPE-01/02 | Unofficial API, no mock can guarantee field shapes match real response | Run `python -c "import httpx; r = httpx.get('https://api-web.nhle.com/v1/gamecenter/2024020001/play-by-play'); print(list(r.json().keys()))"` and verify `rosterSpots` and `plays` fields exist |
| Full-season idempotency (second run = 0 new rows) | PIPE-03 | Requires live DB with pre-ingested data | Run pipeline twice on same season; verify row count is identical after second run |
| Post-run row count matches NHL.com | PIPE-01/03 | Requires manual cross-reference | After ingestion, check 2-3 specific game IDs on NHL.com; compare shot counts to `SELECT COUNT(*) FROM nhl_raw.shot_events WHERE game_id = X` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
