# Milestones

## v1.0 MVP (Shipped: 2026-07-07)

**Phases completed:** 5 phases, 17 plans
**Timeline:** 2025-11-03 → 2026-07-07 (247 days)
**Codebase:** ~5,290 lines TypeScript | ~34 files changed | 69 commits

**Delivered:** Hockey performance tracker shipped to Vercel — players can log games, import Instat PDFs, track mental state, and see correlation insights from real persisted data.

**Key accomplishments:**

- Connected Neon Postgres and removed all mock data bypasses — full-stack persistence verified end-to-end (Phase 1)
- Edit game (pre-filled form), in-page delete confirmation, and "Log check-in" nudge on dashboard (Phase 2)
- Instat PDF upload auto-fills add-game form: goals, assists, shots, opponent, date, +/-, ice time (Phase 3)
- Recharts dashboard with summary cards, correlation insights, line chart (points/game), bar chart (confidence + sleep) (Phase 4)
- Vercel deployment with Neon Postgres, CSP/HSTS/X-Frame-Options security headers, in-memory rate limiting, all secrets in Vercel dashboard (Phase 5)

### Known Gaps

- **MENTAL-02** (mobile slider feel): Automated checks confirm 48px touch targets; human device test not completed. Sliders work but may benefit from native mobile slider refinement in v1.1.

---

## v2.0 Polish + NHL Pipeline (Shipped: 2026-07-18)

**Phases completed:** 2 phases (6–7), 8 plans
**Timeline:** 2026-07-18 (1 day)
**Codebase:** ~6,993 lines TypeScript + Python | ~56 files changed | 27 commits

**Delivered:** Production-quality UX polish (logout, skeletons, error/empty states, form spinners) and a standalone Python NHL data pipeline ingesting a full season of shot events into Postgres — smoke-tested against live NHL API with confirmed idempotency.

**Key accomplishments:**

- Shared Header component with NextAuth signOut Logout button wired to all main pages — explicit `callbackUrl` prevents production redirect loop (Phase 6)
- Three route-level loading.tsx skeleton files with CSS shimmer — never a blank screen during data loads (Phase 6)
- /games page rebuilt with full lifecycle: skeleton loading, inline error state with retry, empty state CTA, full games table (Phase 6)
- Dashboard and game detail restructured with shared Header in all states + `key={gameId}` same-segment remount (Phase 6)
- Loader2 spinner feedback on all form submit buttons (add game, edit game, mental state) and PDF import label (Phase 6)
- Complete Python NHL data pipeline: argparse CLI, schedule walker, play-by-play shot extractor, idempotent upsert (ON CONFLICT DO NOTHING), tenacity retry — verified against live NHL API (2,352 shots Oct 4 2024; 89k+ shots full season; 0 duplicates on re-run) (Phase 7)

### Known Gaps

- **UX-01 (partial):** Header.tsx Logout not wired to `/games/add`, `/games/[id]/edit`, `/games/[id]/mental` — 3 middleware-protected form pages have no Logout button. Mechanical fix deferred to next maintenance pass.

---
