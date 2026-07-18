# Requirements: Hockey Performance Tracker

**Defined:** 2026-07-07
**Core Value:** Players see the connection between how they felt and how they performed — giving them actionable insight to optimize their mental preparation.

## v2.0 Requirements

Requirements for the v2.0 milestone. Each maps to roadmap phases.

### UX Polish

- [x] **UX-01**: User sees a logout button on every protected page that ends their session and redirects to /auth/login
- [ ] **UX-02**: User sees a skeleton loading UI (not a blank screen) during initial page load on /dashboard, /games, and /games/[id]
- [ ] **UX-03**: User sees a loading indicator on submit buttons during form mutations (add game, edit game, log mental state, delete game) and the button is disabled to prevent double-submit
- [ ] **UX-04**: User sees an informative empty state (not a blank area) when they have no games logged
- [ ] **UX-05**: User sees a graceful error UI with a retry option when /dashboard or /games fails to load data

### NHL Pipeline

- [ ] **PIPE-01**: Pipeline walks a full NHL season's date range and collects all gameIds via the schedule endpoint
- [ ] **PIPE-02**: Pipeline fetches play-by-play for each game and filters to shot events (shot-on-goal, goal, missed-shot, blocked-shot)
- [ ] **PIPE-03**: Pipeline inserts shot events into a `nhl_raw.shot_events` table in Postgres with idempotent upsert (no duplicate rows on re-run)
- [ ] **PIPE-04**: Pipeline rate-limits requests (~1 req/sec), retries on 429/503 with exponential backoff, logs failed games without crashing the run, and outputs a post-ingestion row count

## Future Requirements

### App Polish (deferred)

- **UX-06**: Optimistic UI on mental state sliders (enhancement — sliders already work)
- **UX-07**: Granular per-section Suspense on dashboard (only if measurably slow in production)

### Pipeline Extensions (deferred)

- **PIPE-05**: Checkpoint/resume manifest (pipeline_runs table) to reduce re-run cost after partial failures
- **PIPE-06**: Scheduled pipeline execution via GitHub Actions cron
- **PIPE-07**: xG model training and scoring on ingested shot data

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| NextAuth v5 upgrade | Breaking API change; v4.24.x is working in production — no benefit to v2.0 |
| SQLAlchemy ORM for pipeline | Overkill for a batch insert script; raw psycopg3 is correct weight |
| Concurrent/async NHL API fetching | IP block risk; sequential with rate limiting is sufficient for one-time seasonal ingest |
| Real-time features (live scores, push notifications) | Post-launch, out of scope per v1.0 decisions |
| Social features (team comparisons, sharing) | Post-launch |
| Mobile native app | Web-first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
| ----------- | ----- | ------ |
| UX-01 | Phase 6 | Complete |
| UX-02 | Phase 6 | Pending |
| UX-03 | Phase 6 | Pending |
| UX-04 | Phase 6 | Pending |
| UX-05 | Phase 6 | Pending |
| PIPE-01 | Phase 7 | Pending |
| PIPE-02 | Phase 7 | Pending |
| PIPE-03 | Phase 7 | Pending |
| PIPE-04 | Phase 7 | Pending |

**Coverage:**

- v2.0 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---

*Requirements defined: 2026-07-07*
*Last updated: 2026-07-07 — traceability confirmed against ROADMAP.md v2.0 phases*
