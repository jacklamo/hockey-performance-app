# Requirements: Hockey Performance Tracker

**Defined:** 2026-03-03
**Core Value:** Players see the connection between mental state and on-ice performance

## v1 Requirements

### Database & Persistence

- [x] **DB-01**: All game data persists to Vercel Postgres (no mock data fallbacks)
- [x] **DB-02**: User accounts persist across sessions and deployments
- [x] **DB-03**: Mental state data is reliably linked to game records

### Authentication

- [x] **AUTH-01**: User can sign up with email and password (already built — must connect to real DB)
- [x] **AUTH-02**: User can log in and session persists across browser refresh (already built)
- [x] **AUTH-03**: Protected routes redirect unauthenticated users to login

### Game Management

- [ ] **GAME-01**: User can manually add a game with stats (date, opponent, home/away, result, goals, assists, shots, +/-, ice time)
- [ ] **GAME-02**: User can edit an existing game's stats
- [ ] **GAME-03**: User can delete a game (with confirmation)
- [ ] **GAME-04**: User can view all games in a list sorted by date (newest first)
- [ ] **GAME-05**: User can view a game's full detail (stats + mental state)

### Mental State Tracking

- [ ] **MENTAL-01**: User can log mental state after a game (confidence, sleep hours, sleep quality, stress, physical energy, notes)
- [ ] **MENTAL-02**: Mental state form is mobile-friendly with large touch targets
- [ ] **MENTAL-03**: User can see mental state data on the game detail view

### PDF Import

- [ ] **PDF-01**: User can upload an Instat full game report PDF
- [ ] **PDF-02**: App parses the PDF and pre-fills the add game form fields
- [ ] **PDF-03**: User can review and correct extracted data before saving

### Dashboard & Insights

- [ ] **DASH-01**: Dashboard shows summary cards (games played, avg points, avg confidence, avg sleep)
- [ ] **DASH-02**: Correlation insights show when user has 5+ games with mental state logged
- [ ] **DASH-03**: Line chart shows points per game over time
- [ ] **DASH-04**: Bar chart shows confidence and sleep by game
- [ ] **DASH-05**: Charts are mobile responsive

### Production Readiness

- [ ] **PROD-01**: App deployed to Vercel with Vercel Postgres connected
- [ ] **PROD-02**: All environment variables configured in Vercel (NEXTAUTH_SECRET, DATABASE_URL)
- [ ] **PROD-03**: Database migrations run in production
- [ ] **PROD-04**: Security headers configured (CSRF, XSS protection)
- [ ] **PROD-05**: API rate limiting in place
- [ ] **PROD-06**: No hardcoded secrets or mock data bypasses in production code

## v2 Requirements

### Enhanced Analytics

- **ANLYT-01**: More correlation types (stress vs performance, physical energy vs shots)
- **ANLYT-02**: Trend analysis over time (improving / declining)
- **ANLYT-03**: Season summary view

### Social / Team Features

- **TEAM-01**: Share summary with coach
- **TEAM-02**: Team-level aggregated insights

## Out of Scope

| Feature | Reason |
|---------|--------|
| CSV import | Pivoted to PDF import |
| Real-time notifications | Post-launch complexity |
| Mobile native app | Web-first approach |
| Social/sharing features | Post-launch |
| Video analysis | Out of scope for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1 | Complete |
| DB-02 | Phase 1 | Complete |
| DB-03 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| GAME-01 | Phase 1 | Pending |
| GAME-04 | Phase 1 | Pending |
| GAME-05 | Phase 1 | Pending |
| GAME-02 | Phase 2 | Pending |
| GAME-03 | Phase 2 | Pending |
| MENTAL-01 | Phase 2 | Pending |
| MENTAL-02 | Phase 2 | Pending |
| MENTAL-03 | Phase 2 | Pending |
| PDF-01 | Phase 3 | Pending |
| PDF-02 | Phase 3 | Pending |
| PDF-03 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| PROD-01 | Phase 5 | Pending |
| PROD-02 | Phase 5 | Pending |
| PROD-03 | Phase 5 | Pending |
| PROD-04 | Phase 5 | Pending |
| PROD-05 | Phase 5 | Pending |
| PROD-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 — traceability updated with final phase assignments*
