# Roadmap: Hockey Performance Tracker

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-07-07)
- 🔄 **v2.0 Polish + NHL Pipeline** — Phases 6-7 (in progress)

## Phases

### ✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-07-07

- [x] Phase 1: Database Foundation (5/5 plans) — completed 2026-03-10
- [x] Phase 2: Game Management & Mobile Polish (3/3 plans) — completed 2026-03-10
- [x] Phase 3: PDF Import (3/3 plans) — completed 2026-03-17
- [x] Phase 4: Dashboard & Charts (2/2 plans) — completed 2026-05-05
- [x] Phase 5: Production Hardening (4/4 plans) — completed 2026-07-07

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

### v2.0 Polish + NHL Pipeline (Phases 6-7)

- [x] **Phase 6: UX Polish** — Production-quality UX: logout wired, no blank screens, no double-submit, graceful errors (completed 2026-07-18)
- [ ] **Phase 7: NHL Data Pipeline** — Standalone Python pipeline ingesting a full season of shot events into nhl_raw.shot_events

## Phase Details

### Phase 6: UX Polish

**Goal**: Every protected page handles its full lifecycle — the user always knows what is happening, can always leave their session, and is never stranded by a blank screen or a silent failure

**Depends on**: Nothing (app already in production; all patterns use existing dependencies)

**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05

**Success Criteria** (what must be TRUE):

1. A logout button is visible on every protected page; clicking it ends the session and lands the user on /auth/login with no redirect loop
2. Navigating to /dashboard, /games, or any /games/[id] shows a skeleton placeholder immediately — never a blank white screen — while data loads
3. Every form submit button (add game, edit game, log mental state, delete game) shows a spinner and becomes disabled the moment it is clicked, and re-enables only after the server responds
4. When a user has no games logged, /dashboard and /games show a clear empty state with a call to action — not an empty table or blank area
5. When /dashboard or /games fails to fetch data, the user sees an error message with a retry button that re-attempts the load without a full page refresh

**Plans**: 5 plans

Plans:

- [ ] 06-01-PLAN.md — Shared Header component + globals.css shimmer CSS (foundation)
- [ ] 06-02-PLAN.md — Three loading.tsx skeleton files (dashboard, games, game detail)
- [ ] 06-03-PLAN.md — New /games/page.tsx with full lifecycle (loading, error, empty, content)
- [ ] 06-04-PLAN.md — Wire Header into dashboard + game detail, fix lifecycle states, delete Loader2
- [ ] 06-05-PLAN.md — Loader2 submit feedback on add, edit, and mental state forms

### Phase 7: NHL Data Pipeline

**Goal**: A standalone Python script in /data-pipeline can ingest a complete NHL regular season of shot events into the nhl_raw.shot_events Postgres table with idempotency, rate-limiting, and a post-run row-count validation — with no coupling to the Next.js app

**Depends on**: Phase 6 (ordering only — pipeline is independent of app code; Phase 6 goes first to ship user-facing value first)

**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04

**Success Criteria** (what must be TRUE):

1. Running the pipeline for a full season produces a nhl_raw.shot_events table in Postgres with the correct row count for that season (verified against NHL.com game logs)
2. Running the pipeline a second time on the same season produces zero new rows (idempotent upsert — no duplicates)
3. The pipeline completes a full season run without crashing; games that return 429 or 503 are retried with exponential backoff, and games that still fail after retries are logged and skipped without halting the run
4. The pipeline outputs a post-ingestion summary to stdout: total games processed, total shot events inserted, count of failed games, and final row count queried from nhl_raw.shot_events

**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — Project scaffold + Wave 0 test stubs (pytest harness for all 4 PIPE requirements)
- [ ] 07-02-PLAN.md — Core ingest.py: NHL API functions + DB writer functions (tests green)
- [ ] 07-03-PLAN.md — main() CLI loop + progress/summary + integration smoke test verification

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
| ----- | --------- | -------------- | ------ | --------- |
| 1. Database Foundation | v1.0 | 5/5 | Complete | 2026-03-10 |
| 2. Game Management & Mobile Polish | v1.0 | 3/3 | Complete | 2026-03-10 |
| 3. PDF Import | v1.0 | 3/3 | Complete | 2026-03-17 |
| 4. Dashboard & Charts | v1.0 | 2/2 | Complete | 2026-05-05 |
| 5. Production Hardening | v1.0 | 4/4 | Complete | 2026-07-07 |
| 6. UX Polish | 5/5 | Complete   | 2026-07-18 | - |
| 7. NHL Data Pipeline | 2/3 | In Progress|  | - |
