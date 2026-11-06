# Roadmap: Hockey Performance Tracker

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-07-07)
- ✅ **v2.0 Polish + NHL Pipeline** — Phases 6-7 (shipped 2026-07-18)
- 🚧 **v3.0 Trust & Insight Quality** — Phases 8-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-07-07</summary>

- [x] Phase 1: Database Foundation (5/5 plans) — completed 2026-03-10
- [x] Phase 2: Game Management & Mobile Polish (3/3 plans) — completed 2026-03-10
- [x] Phase 3: PDF Import (3/3 plans) — completed 2026-03-17
- [x] Phase 4: Dashboard & Charts (2/2 plans) — completed 2026-05-05
- [x] Phase 5: Production Hardening (4/4 plans) — completed 2026-07-07

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v2.0 Polish + NHL Pipeline (Phases 6-7) — SHIPPED 2026-07-18</summary>

- [x] Phase 6: UX Polish (5/5 plans) — completed 2026-07-18
- [x] Phase 7: NHL Data Pipeline (3/3 plans) — completed 2026-07-18

Full details: [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)

</details>

## v3.0 Trust & Insight Quality (Phases 8-13)

- [ ] **Phase 8: Schema & Seeds** - Additive migration for goalie, timing and age fields; position validation; demo seeds for skater and goalie
- [ ] **Phase 9: Honest Insights** - Progress state, shared thresholds, sample size shown, tentative wording, check-in-only games
- [ ] **Phase 10: Goalie Support** - Goalie game logging, list/detail, dashboard, SV% insights; optional Instat goalie PDF last
- [ ] **Phase 11: Check-in Timing** - Before/after game declared, server timestamp, legacy as unknown, nudges and insight caveats
- [ ] **Phase 12: Privacy, Minors & Signup** - Optional Team Name, 13+ age gate, Privacy/Terms, account deletion, disclaimer, honest copy
- [ ] **Phase 13: Branding, Previews & Launch** - GameFeel branding everywhere, link previews, gamefeel.app URLs, end-to-end demo run, mobile slider check

## Phase Details

### Phase 8: Schema & Seeds
**Goal**: The database safely supports everything v3.0 needs without disturbing existing users, games or check-ins
**Depends on**: Nothing (first v3.0 phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. Migration applied to a Neon branch copy of production leaves every existing user, game and check-in readable and unchanged
  2. A goalie game with shots against, goals against and saves can be stored while skater games are unaffected
  3. Saving or reading a position outside Center, Left Wing, Right Wing, Defenseman, Goalie is rejected or normalized
  4. Starting a demo as a skater or as a goalie yields data that exercises the new features
**Plans**: 4 plans
- [ ] 08-01-PLAN.md — Additive schema + migration (NOT VALID position CHECK)
- [ ] 08-02-PLAN.md — Shared positions module, signup route and form
- [ ] 08-03-PLAN.md — Skater/goalie demo seeds, credentials, two demo buttons
- [ ] 08-04-PLAN.md — Neon branch rehearsal (manual checkpoint)

**Note**: Migration also carries the nullable columns for Team Name, birth year and check-in timing (used by Phases 11-12). Timing model decided: player-declared before/after (legacy rows = unknown) plus a set-once server timestamp.

### Phase 9: Honest Insights
**Goal**: Players are never shown noise as insight and always know why an insight is, or is not, available
**Depends on**: Phase 8
**Requirements**: INSI-01, INSI-02, INSI-03, INSI-04, INSI-05
**Success Criteria** (what must be TRUE):
  1. Player below the threshold sees "N of 8 check-ins" instead of a missing section
  2. Insights unlock only at 8 games with check-ins and at least 3 games in each compared group, from one shared constant
  3. Every insight states the number of games behind it and uses tentative, non-causal wording
  4. With enough games but a tiny difference, player sees a "no clear pattern yet" message
  5. Games without a check-in never count toward any insight
**Plans**: TBD

### Phase 10: Goalie Support
**Goal**: Goalies can track games and see insights using metrics that mean something for their position, while skaters see no change
**Depends on**: Phase 9
**Requirements**: GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, GOAL-06, GOAL-07
**Success Criteria** (what must be TRUE):
  1. Goalie can add, edit and delete a game with shots against, goals against and saves
  2. Goalie's game list and detail show shots against, goals against and save %, with no save % for a zero-shot game
  3. Goalie's dashboard cards and charts use goalie metrics and show no points-based chart
  4. Goalie sees confidence and sleep vs save % insights that ignore low-workload games
  5. Skater flows look and behave exactly as before
  6. (Optional, last) Goalie can import an Instat goalie PDF to pre-fill the form, with a saves + GA = SA check and manual entry as fallback
**Plans**: 5 plans
- [ ] 10-01-PLAN.md — Position in session, goalie.ts helpers, games API branching
- [ ] 10-02-PLAN.md — Goalie add/edit forms, list and detail
- [ ] 10-03-PLAN.md — Goalie insights and chart data logic (tested)
- [ ] 10-04-PLAN.md — Goalie dashboard, insights page, walkthrough checkpoint
- [ ] 10-05-PLAN.md — Instat goalie PDF import (optional, droppable, needs sample PDF)

### Phase 11: Check-in Timing
**Goal**: Players log check-ins before the game, and insights are honest about when each check-in was made
**Depends on**: Phase 9
**Requirements**: TIME-01, TIME-02, TIME-03, TIME-04, TIME-05
**Success Criteria** (what must be TRUE):
  1. Player picks before or after the game on each check-in
  2. Editing a check-in never changes its server-recorded first-made time
  3. Check-ins made before this change show as "unknown" timing and are never counted as pre-game
  4. Game pages and the dashboard nudge toward pre-game logging and label after-game entries
  5. Insights say which check-ins they used and separate or call out pre-game ones when both exist
**Plans**: TBD

### Phase 12: Privacy, Minors & Signup
**Goal**: New and existing players can trust how their data is handled, and signup excludes children under 13
**Depends on**: Phase 8
**Requirements**: PRIV-01, PRIV-02, PRIV-03, PRIV-04, PRIV-05, PRIV-06, PRIV-07
**Success Criteria** (what must be TRUE):
  1. Player can sign up without a Team Name and nothing breaks for them
  2. Signup asks birth year, blocks under-13 without storing their data, and keeps birth year for 13+
  3. Privacy Policy and Terms are public and linked from signup and the footer; signup and landing state who can see data, matching the code
  4. Player can delete their account and all their data inside the app
  5. Check-in pages show a not-medical-advice note with 988; landing page and meta description tell one consistent story
**Plans**: TBD
**Note**: Privacy and Terms text needs human/legal review.

### Phase 13: Branding, Previews & Launch
**Goal**: GameFeel presents consistently, shares well, and a stranger can try the live demo end to end
**Depends on**: Phases 10, 11, 12
**Requirements**: BRND-01, BRND-02, BRND-03, BRND-04, BRND-05, MENTAL-02
**Success Criteria** (what must be TRUE):
  1. GameFeel name, GF logo and favicon appear on every page, README and docs
  2. Sharing gamefeel.app in chat apps and LinkedIn shows title, description and image, with no user data in metadata
  3. Preview image, icons and robots.txt load without logging in
  4. `NEXTAUTH_URL` and hard-coded links point to gamefeel.app
  5. A fresh incognito demo run works end to end as skater and as goalie with no signup
  6. Mental state sliders feel right on a physical phone
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
| ----- | --------- | -------------- | ------ | --------- |
| 1. Database Foundation | v1.0 | 5/5 | Complete | 2026-03-10 |
| 2. Game Management & Mobile Polish | v1.0 | 3/3 | Complete | 2026-03-10 |
| 3. PDF Import | v1.0 | 3/3 | Complete | 2026-03-17 |
| 4. Dashboard & Charts | v1.0 | 2/2 | Complete | 2026-05-05 |
| 5. Production Hardening | v1.0 | 4/4 | Complete | 2026-07-07 |
| 6. UX Polish | v2.0 | 5/5 | Complete | 2026-07-18 |
| 7. NHL Data Pipeline | v2.0 | 3/3 | Complete | 2026-07-18 |
| 8. Schema & Seeds | v3.0 | 0/0 | Not started | - |
| 9. Honest Insights | v3.0 | 0/0 | Not started | - |
| 10. Goalie Support | 3/5 | In Progress|  | - |
| 11. Check-in Timing | v3.0 | 0/0 | Not started | - |
| 12. Privacy, Minors & Signup | v3.0 | 0/0 | Not started | - |
| 13. Branding, Previews & Launch | v3.0 | 0/0 | Not started | - |
