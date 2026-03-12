# Roadmap: Hockey Performance Tracker

## Overview

The app is ~80% feature-complete but running entirely on mock data. This roadmap completes the journey to production: connect real database (unblocking everything), finish the remaining game management and mobile polish, add PDF import and charts, then harden and deploy. Five phases deliver a production-ready app where players can log games, track mental state, and see genuine correlations from their own data.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database Foundation** - Connect Railway Postgres, remove all mock data bypasses, verify existing features work end-to-end with real data (completed 2026-03-10)
- [ ] **Phase 2: Game Management & Mobile Polish** - Add edit/delete game, complete mental state mobile UX
- [ ] **Phase 3: PDF Import** - Upload Instat PDF, parse and pre-fill add game form
- [ ] **Phase 4: Dashboard & Charts** - Summary cards, correlation insights, Recharts visualizations
- [ ] **Phase 5: Production Hardening** - Security headers, rate limiting, Vercel deployment, env config

## Phase Details

### Phase 1: Database Foundation

**Goal**: The app runs on real persisted data — no mock fallbacks, no hardcoded users, all existing features verified against live Postgres (Railway)
**Depends on**: Nothing (first phase)
**Requirements**: DB-01, DB-02, DB-03, AUTH-01, AUTH-02, AUTH-03, GAME-01, GAME-04, GAME-05
**Success Criteria** (what must be TRUE):

1. User can sign up, close the browser, reopen, and log in with the same credentials — account persists
2. User can add a game and immediately see it in the games list — data is in Postgres, not memory
3. User can view a game's full detail page and the stats match exactly what was entered
4. Unauthenticated users navigating to /dashboard or /games are redirected to /login
5. No API route returns mock data — all try/catch mock fallbacks are removed from the codebase

**Plans**: 5 plans

Plans:

- [ ] 01-01-PLAN.md — Provision Railway Postgres, update .env, verify connection
- [ ] 01-02-PLAN.md — Run initial Prisma migration, delete duplicate app/api/ directory
- [ ] 01-03-PLAN.md — Remove auth dev bypasses (requireAuth + authorize), create middleware.ts
- [ ] 01-04-PLAN.md — Remove inner try/catch mock bypasses from API route files
- [ ] 01-05-PLAN.md — Remove frontend MOCK_GAMES/useMockData, end-to-end verification

### Phase 2: Game Management & Mobile Polish

**Goal**: Players can fully manage their game history and log mental state comfortably on a phone
**Depends on**: Phase 1
**Requirements**: GAME-02, GAME-03, MENTAL-01, MENTAL-02, MENTAL-03
**Success Criteria** (what must be TRUE):

1. User can open a game detail page, tap Edit, change stats, save — the updated stats appear immediately
2. User can delete a game with a confirmation step — the game is gone from the list
3. User can log mental state on a phone with sliders that are easy to hit with a thumb (no mis-taps)
4. Mental state data (confidence, sleep, stress, energy, notes) appears on the game detail view after saving

**Plans**: 3 plans

Plans:

- [ ] 02-01-PLAN.md — Fix mental page async params bug + wire post-add redirect to mental state form
- [ ] 02-02-PLAN.md — Create edit game page (pre-filled form) + upgrade delete to in-page confirmation
- [ ] 02-03-PLAN.md — Add "Log check-in" nudge to dashboard for games missing mental state

### Phase 3: PDF Import

**Goal**: Players can upload an Instat full game report PDF and have the add game form pre-filled from it
**Depends on**: Phase 2
**Requirements**: PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):

1. User can upload a PDF file from the add game page without a page reload
2. After upload, the game form fields (goals, assists, shots, opponent, date) are populated from the PDF
3. User can review and correct any extracted field before saving — nothing auto-saves from import

**Plans**: 2 plans

Plans:

- [ ] 03-01-PLAN.md — Install Jest, configure for Next.js, write test stubs for parser + route (Wave 0)
- [ ] 03-02-PLAN.md — Implement parseInstatPdf lib + API route + add game page UI integration (Wave 1)

### Phase 4: Dashboard & Charts

**Goal**: The dashboard shows real data with meaningful correlations and visual trends from the player's actual game history
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):

1. Dashboard summary cards show accurate counts and averages drawn from the player's real game data
2. When a player has 5+ games with mental state logged, correlation insights (confidence vs points, sleep vs points) display
3. Line chart shows the player's points per game over time, ordered chronologically
4. Bar chart shows confidence and sleep values per game, readable on a phone screen

**Plans**: TBD

### Phase 5: Production Hardening

**Goal**: The app is deployed to Vercel, secure, and ready for real players to use
**Depends on**: Phase 4
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06
**Success Criteria** (what must be TRUE):

1. App is live at the Vercel URL — accessible from any device without running locally
2. Database migrations have run in production and all tables exist with correct schema
3. NEXTAUTH_SECRET and DATABASE_URL are set in Vercel env vars — no secrets in code
4. Security headers (CSP, X-Frame-Options, XSS protection) are present on all responses
5. API endpoints return 429 after excessive requests — rate limiting is active

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation | 5/5 | Complete   | 2026-03-10 |
| 2. Game Management & Mobile Polish | 0/3 | Not started | - |
| 3. PDF Import | 0/2 | Not started | - |
| 4. Dashboard & Charts | 0/? | Not started | - |
| 5. Production Hardening | 0/? | Not started | - |
