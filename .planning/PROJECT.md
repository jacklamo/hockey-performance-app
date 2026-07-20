# Hockey Performance Tracker

## What This Is

A web app that helps hockey players understand how mental factors (sleep, confidence, stress, physical energy) correlate with their on-ice performance. Players log game stats and mental state after each game — or import Instat PDF reports to auto-fill stats — and the app surfaces patterns: e.g., "You average 2.5 points per game when confident vs 1.1 when not."

Deployed to Vercel with Neon Postgres. Production-ready as of v1.0. UX-polished and NHL pipeline live as of v2.0.

## Core Value

Players see the connection between how they felt and how they performed — giving them actionable insight to optimize their mental preparation.

## Requirements

### Validated

- ✓ Authentication (signup/login with email + password, session persistence) — v1.0
- ✓ Add game form (manual stat entry with validation) — v1.0
- ✓ Mental state form (post-game sliders for confidence, sleep, stress, energy) — v1.0
- ✓ Games list view (table + mobile card view, sorted by date) — v1.0
- ✓ Game detail view (full stats + mental state display) — v1.0
- ✓ Real database connection (Neon Postgres via Vercel Marketplace — all mock bypasses removed) — v1.0
- ✓ Edit game page (/games/[id]/edit — pre-filled form, PUT to API) — v1.0
- ✓ Delete game (in-page confirmation, no modal) — v1.0
- ✓ "Log check-in" nudge on dashboard for games missing mental state — v1.0
- ✓ PDF import (upload Instat full game report → auto-fill add-game form fields) — v1.0
- ✓ Dashboard summary cards (games played, avg points, avg confidence, avg sleep) — v1.0
- ✓ Correlation insights when 5+ games with mental state logged — v1.0
- ✓ Line chart: points per game over time (Recharts, mobile-responsive) — v1.0
- ✓ Bar chart: confidence and sleep by game (Recharts, mobile-responsive) — v1.0
- ✓ Protected routes redirect unauthenticated users (middleware + API requireAuth) — v1.0
- ✓ Security headers (CSP, HSTS, X-Frame-Options, XSS protection) — v1.0
- ✓ Rate limiting on auth routes (in-memory, 10 req/min per IP) — v1.0
- ✓ Secrets secured in Vercel dashboard (NEXTAUTH_SECRET, DATABASE_URL) — v1.0
- ✓ Prisma migrations run on every Vercel deploy (prisma generate && prisma migrate deploy) — v1.0
- ✓ Logout button wired to NextAuth signOut with callbackUrl on all main protected pages — v2.0
- ✓ Skeleton loading UI (CSS shimmer, route-level loading.tsx) on /dashboard, /games, /games/[id] — v2.0
- ✓ Loading indicator + disabled state on all form submit buttons (add, edit, mental state, delete) — v2.0
- ✓ Empty state with CTA when no games logged — v2.0
- ✓ Inline error state with retry button on /dashboard and /games — v2.0
- ✓ NHL shot events pipeline (Python, psycopg3, tenacity) — full season ingest, idempotent upsert, rate-limited — v2.0

### Active

- [ ] Logout button on form pages: `/games/add`, `/games/[id]/edit`, `/games/[id]/mental` — UX-01 gap from v2.0
- [ ] Mobile slider feel for mental state form (MENTAL-02 — 48px targets confirmed, human device test pending)

### Out of Scope

- CSV import — pivoted to PDF import
- Real-time features (live score updates, push notifications) — post-launch
- Social features (team comparisons, sharing) — post-launch
- Mobile native app — web-first
- Video analysis integration — post-launch
- Optimistic UI on mental state sliders (UX-06) — deferred; sliders work correctly
- Granular per-section Suspense on dashboard (UX-07) — deferred; only if measurably slow in production
- Pipeline checkpoint/resume manifest (PIPE-05) — deferred; full re-run is acceptable for seasonal ingestion
- Scheduled pipeline execution via GitHub Actions (PIPE-06) — deferred
- xG model training on ingested shot data (PIPE-07) — deferred; data is now available

## Context

- Stack: Next.js 16 App Router, TypeScript, Tailwind CSS 4, NextAuth.js, Prisma 6, PostgreSQL
- Pipeline: Python 3, httpx, psycopg3, tenacity, python-dotenv, pytest
- Deployment: Vercel + Neon Postgres (provisioned via Vercel Marketplace)
- ~6,993 lines TypeScript + Python; 25 plans across 7 phases; ~96 commits
- **v1.0 shipped 2026-07-07** — all core features live and verified in production
- **v2.0 shipped 2026-07-18** — UX polish complete; NHL pipeline live and smoke-tested (89k+ shots full season)
- PDF parsing: pdf-parse v1.1.1 (downgraded from v2 for CJS default export compatibility)
- Middleware: middleware.ts at project root (Next.js App Router requirement)
- CSP uses unsafe-inline (no nonces) to preserve Next.js static optimization
- NHL API: `https://api-web.nhle.com/v1` — unofficial but stable; ~1 req/s rate limit (community consensus)
- nhl_raw.shot_events: Neon DB, separate schema from app tables — no coupling to Next.js app

## Constraints

- **Tech Stack**: Next.js + Prisma + Vercel — keep stack consistent, no framework changes
- **Database**: Neon Postgres via Vercel Marketplace (DATABASE_URL pooled + DATABASE_URL_UNPOOLED direct)
- **No breaking changes**: Existing routes and data model preserved

## Key Decisions

| Decision | Rationale | Outcome |
| -------- | --------- | ------- |
| PDF import over CSV | Instat exports full game reports as PDFs natively | ✓ Good — parser handles real Instat format after fixture realignment |
| Vercel + Neon Postgres | Simplest integration; Marketplace auto-injects DATABASE_URL | ✓ Good — zero-config DB provisioning |
| PDF → pre-fill form (not auto-create) | Lets player review/correct before saving | ✓ Good — validation gap avoided |
| Keep NextAuth credentials provider | Already implemented, sufficient for v1 | ✓ Good — no auth rework needed |
| Railway → Neon migration | Neon provisioned via Vercel Marketplace; Railway used for local dev | ✓ Good — directUrl in schema.prisma handles both |
| CSP unsafe-inline (no nonces) | Nonces incompatible with Next.js static optimization | ✓ Good — locked decision; revisit only if CSP strictness is required |
| HSTS production-only | isDev flag prevents localhost redirect loop | ✓ Good — clean dev experience |
| pdf-parse v1.1.1 (not v2) | v2 lacks CJS default export, breaks jest.mock factory form | ✓ Good — v1.1.1 stable |
| Async params pattern for dynamic routes | Next.js 16 requires Promise params; useEffect + gameId state guard | ✓ Good — consistent across all dynamic route pages |
| In-page delete confirmation (no modal) | Better mobile UX; avoids modal z-index issues | ✓ Good — simpler implementation |
| Baselining Prisma migration | Tables pre-existed from prior db push; used migrate resolve --applied | ✓ Good — avoided destructive reset |
| Zero new npm deps for UX polish | All UX primitives (loading.tsx, lucide-react, signOut) already installed | ✓ Good — no dependency churn |
| signOut with explicit callbackUrl | Default redirect loops in production if NEXTAUTH_URL misconfigured | ✓ Good — locked decision |
| Error state inline (not full-screen) | Header + Logout always accessible in error state | ✓ Good — UX consistency |
| key={gameId} on game detail root | loading.tsx doesn't re-trigger on same-segment nav; key forces remount | ✓ Good — correct behavior |
| Pipeline writes to nhl_raw schema | Prevents lock contention against live app tables; uses unpooled connection | ✓ Good — clean separation |
| Sequential pipeline fetching (~1 req/s) | Concurrent fetching risks NHL API IP block | ✓ Good — no issues during full-season run |
| Idempotent upsert: ON CONFLICT DO NOTHING | Prevents duplicate rows on pipeline re-runs | ✓ Good — confirmed 0 duplicates |
| _psycopg_url() to strip Prisma schema= param | psycopg3 rejects schema= as invalid URI parameter; Prisma accepts it silently | ✓ Good — fixed connection bug |

---

*Last updated: 2026-07-18 after v2.0 milestone*
