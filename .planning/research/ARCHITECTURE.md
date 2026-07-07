# Architecture Research

**Domain:** Next.js App Router SPA with Python data pipeline sidecar
**Researched:** 2026-07-07
**Confidence:** HIGH (based on direct code inspection of the running codebase)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser (Client)                           │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Client Component Pages ('use client')                 │     │
│  │  dashboard/page.tsx  games/[id]/page.tsx  etc.         │     │
│  │  useEffect → fetch('/api/...') → useState              │     │
│  └─────────────────────────┬──────────────────────────────┘     │
└────────────────────────────│────────────────────────────────────┘
                             │ HTTP
┌────────────────────────────│────────────────────────────────────┐
│                      Vercel Edge (middleware.ts)                 │
│  Auth check (getToken) + Rate limit (/api/auth/*)               │
└────────────────────────────│────────────────────────────────────┘
                             │
┌────────────────────────────│────────────────────────────────────┐
│                   Next.js Server (Vercel)                        │
│  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │ app/api/games │  │ app/api/auth/    │  │ app/api/games/  │   │
│  │   route.ts    │  │ [...nextauth]/   │  │  parse-pdf/     │   │
│  │  GET / POST   │  │   route.ts       │  │   route.ts      │   │
│  └──────┬────────┘  └──────────────────┘  └─────────────────┘   │
│         │ Prisma Client                                          │
└─────────│───────────────────────────────────────────────────────┘
          │
┌─────────│───────────────────────────────────────────────────────┐
│         │              Neon Postgres                             │
│  ┌──────┴────────────────────────────────────────────────┐      │
│  │  User  |  Game  |  MentalState        (Prisma schema) │      │
│  ├───────────────────────────────────────────────────────┤      │
│  │  nhl_shots                          (pipeline schema) │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  /data-pipeline  (Python, local-only)           │
│  fetch_shots.py → transform.py → load.py → Neon Postgres        │
│  validate/spot_check.py                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current Implementation |
|-----------|----------------|------------------------|
| `middleware.ts` | Auth gate + rate limit | `getToken` JWT check; in-memory ipMap for /api/auth |
| `app/api/games/route.ts` | CRUD for game records | `requireAuth()` from src/lib/auth.ts |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth JWT session | CredentialsProvider + bcrypt |
| `src/lib/prisma.ts` | Singleton Prisma client | Pooled connection via DATABASE_URL |
| Page components | Data fetch + render | All 'use client'; useEffect + useState |

---

## Recommended Project Structure (v2.0 additions)

```
hockey-performance-tracker/
├── app/
│   ├── components/              # NEW: shared UI components
│   │   ├── Header.tsx           # NEW: extracted nav with logout button
│   │   └── LoadingSkeleton.tsx  # NEW: reusable skeleton UI
│   ├── dashboard/
│   │   ├── loading.tsx          # NEW: route-level skeleton
│   │   └── page.tsx             # MODIFIED: use <Header />, remove inline header
│   ├── games/
│   │   ├── loading.tsx          # NEW: route-level skeleton
│   │   ├── [id]/
│   │   │   ├── loading.tsx      # NEW: route-level skeleton
│   │   │   ├── page.tsx         # MODIFIED: use <Header />
│   │   │   ├── edit/
│   │   │   │   └── page.tsx     # MODIFIED: use <Header />
│   │   │   └── mental/
│   │   │       └── page.tsx     # MODIFIED: use <Header />
│   │   └── add/
│   │       └── page.tsx         # MODIFIED: use <Header />
│   ├── layout.tsx               # MODIFIED: add SessionProvider wrapper
│   └── ...
├── data-pipeline/               # NEW: standalone Python project
│   ├── requirements.txt
│   ├── .env.example
│   ├── config.py
│   ├── ingest/
│   │   ├── __init__.py
│   │   ├── fetch_shots.py       # NHL API client (api-web.nhle.com)
│   │   ├── transform.py         # Row normalization + field mapping
│   │   └── load.py              # Postgres UPSERT via psycopg2/asyncpg
│   ├── validate/
│   │   ├── __init__.py
│   │   └── spot_check.py        # Row count + sample vs NHL.com
│   └── migrations/
│       └── 001_create_nhl_shots.sql
├── prisma/
│   └── schema.prisma            # App schema only (User, Game, MentalState)
├── middleware.ts
└── ...
```

### Structure Rationale

- **`app/components/`**: Extracts shared UI to eliminate the current pattern of duplicated inline headers across every page. All pages currently have identical `<header>` markup — extract once.
- **`loading.tsx` per route segment**: Route-level skeletons shown by Next.js during navigation. Distinct from in-component `isLoading` state (which handles the data fetch after JS mounts).
- **`data-pipeline/` at project root**: Isolated from Next.js app. No shared code, no shared package.json, no shared env. Communicates only through Postgres.
- **`migrations/` inside data-pipeline**: The nhl_shots table is NOT Prisma-managed. Plain SQL migration run manually or via psql. Keeps it separate from the app's migration history.

---

## Architectural Patterns

### Pattern 1: Logout Button via signOut()

**What:** Call `signOut()` from `next-auth/react` in a client component. Clears the JWT cookie and redirects.

**When to use:** Any page with an authenticated header. `signOut()` does NOT require `SessionProvider` — it makes a direct POST to `/api/auth/signout`.

**Trade-offs:** Simple to add. No SessionProvider required. The redirect happens after the server invalidates the session token.

**Key fact:** `layout.tsx` currently has no `SessionProvider`. You do NOT need to add one just for logout — `signOut()` works without it. Only add `SessionProvider` if you later need `useSession()` in a component.

**Example:**
```tsx
// app/components/Header.tsx
'use client';
import { signOut } from 'next-auth/react';

export function Header({ title }: { title: string }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
```

Usage in each page: replace the inline `<header>` block with `<Header title="Performance Dashboard" />`.

---

### Pattern 2: Two-Layer Loading States

**What:** `loading.tsx` handles route transition; in-component `isLoading` state handles the async data fetch. These are independent and both needed.

**When to use:** Always in this app — all pages are client components with `useEffect` data fetching.

**Layer 1 — Route transition (loading.tsx):**
Next.js shows `loading.tsx` automatically when navigating to the route segment, before the client component mounts. This covers the instant between "link clicked" and "JS bundle evaluated." Duration is typically 50–300ms on fast connections.

```tsx
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skeleton header */}
      <div className="bg-white shadow-sm border-b border-gray-200 h-16 animate-pulse" />
      {/* Skeleton cards */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg h-28 animate-pulse border border-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Layer 2 — Data fetch (existing isLoading pattern):**
The current `if (isLoading) return <div>Loading...</div>` pattern is architecturally correct. Polish it by replacing the bare text with a more specific skeleton.

**Trade-offs:** Two loading states can flash in sequence. Minimize this by matching the `loading.tsx` skeleton to the `isLoading` skeleton — they should look identical so the transition is invisible.

**Where loading.tsx files live:**
```
app/dashboard/loading.tsx        — covers /dashboard
app/games/loading.tsx            — covers /games/*
app/games/[id]/loading.tsx       — covers /games/[id], /games/[id]/edit, /games/[id]/mental
```

A `loading.tsx` covers all child routes unless overridden by a more specific one. So `app/games/loading.tsx` suffices for all game sub-routes unless you want different skeletons per sub-route.

---

### Pattern 3: Python Pipeline as Isolated Sidecar

**What:** The data-pipeline is a standalone directory — separate Python interpreter, separate dependencies, separate env file. It connects to the same Neon Postgres database but writes to a different table (`nhl_shots`) that Prisma never touches.

**When to use:** Any data ingestion job that runs offline (not triggered by the web app). The pipeline runs locally or from a CI job; Vercel never executes it.

**Trade-offs:** Complete isolation means no accidental coupling. The cost is managing two environments (Node.js for app, Python for pipeline). Worth it — the pipeline has different dependencies (pandas, psycopg2) that should never pollute the app build.

**Directory boundary rule:** Nothing in `/data-pipeline` imports from `/app` or `/src`. Nothing in `/app` or `/src` queries `nhl_shots` (yet — that's a future feature). The table exists in the same DB instance but is invisible to Prisma because it's not in schema.prisma.

---

## Data Flow

### Logout Flow

```
User clicks Logout button
    ↓
signOut({ callbackUrl: '/auth/login' })   [next-auth/react, client-side]
    ↓
POST /api/auth/signout                    [NextAuth route handler]
    ↓
JWT cookie cleared
    ↓
Redirect to /auth/login
    ↓
middleware.ts blocks /dashboard, /games if token missing — already handled
```

### Loading State Flow (per page)

```
User clicks nav link to /dashboard
    ↓
Next.js shows app/dashboard/loading.tsx immediately   [route transition]
    ↓
Client JS bundle evaluates, component mounts
    ↓
loading.tsx dismissed, component renders with isLoading=true
    ↓
useEffect fires → fetch('/api/games')
    ↓
Response arrives → setGames(data) → setIsLoading(false)
    ↓
Full page renders
```

### NHL Pipeline Data Flow

```
fetch_shots.py
    ↓ NHL API (api-web.nhle.com/v1/gamecenter/{gameId}/play-by-play)
transform.py
    ↓ normalize fields, filter to shot events only
load.py
    ↓ INSERT INTO nhl_shots (...) ON CONFLICT (game_id, event_id) DO NOTHING
validate/spot_check.py
    ↓ SELECT COUNT(*) + sample row comparison vs NHL.com
```

---

## Shots Table Schema

The `nhl_shots` table is managed by raw SQL (not Prisma). Place the DDL in `data-pipeline/migrations/001_create_nhl_shots.sql`.

```sql
CREATE TABLE IF NOT EXISTS nhl_shots (
  id                 BIGSERIAL    PRIMARY KEY,
  game_id            INTEGER      NOT NULL,
  event_id           INTEGER      NOT NULL,
  period             SMALLINT     NOT NULL,          -- 1, 2, 3, 4 (OT), 5 (SO)
  period_type        VARCHAR(10)  NOT NULL,          -- 'REG', 'OT', 'SO'
  time_in_period     SMALLINT     NOT NULL,          -- seconds elapsed in period
  team_id            INTEGER      NOT NULL,          -- NHL team ID (shooting team)
  shooter_player_id  INTEGER      NOT NULL,          -- NHL player ID
  shot_type          VARCHAR(20),                   -- 'WRIST', 'SLAP', 'BACKHAND', 'SNAP', 'TIP', 'WRAP', 'DEFLECTION'
  x_coord            REAL,                          -- feet from center ice, -100 to 100
  y_coord            REAL,                          -- feet from center, -42.5 to 42.5
  is_goal            BOOLEAN      NOT NULL DEFAULT FALSE,
  strength_state     VARCHAR(10)  NOT NULL,          -- 'EV', 'PP', 'SH'
  game_date          DATE         NOT NULL,
  ingested_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT nhl_shots_game_event_unique UNIQUE (game_id, event_id)
);

CREATE INDEX idx_nhl_shots_game_id      ON nhl_shots (game_id);
CREATE INDEX idx_nhl_shots_shooter      ON nhl_shots (shooter_player_id);
CREATE INDEX idx_nhl_shots_game_date    ON nhl_shots (game_date);
CREATE INDEX idx_nhl_shots_team         ON nhl_shots (team_id);
CREATE INDEX idx_nhl_shots_coords       ON nhl_shots (x_coord, y_coord) WHERE x_coord IS NOT NULL;
```

**Schema decisions:**
- `BIGSERIAL` for `id` rather than UUID — these are NHL-sourced rows, not user-generated. Integers are smaller and faster for range scans.
- `UNIQUE (game_id, event_id)` — natural composite key from the NHL API. Use `ON CONFLICT DO NOTHING` on re-runs for idempotency.
- `x_coord`, `y_coord` as `REAL` (32-bit float) — NHL reports coordinates in whole feet; REAL is sufficient and halves storage vs DOUBLE PRECISION.
- `ingested_at` — audit column, no query cost.
- `shot_type` nullable — the NHL API sometimes omits shot type on older play-by-play data.
- Partial index on `(x_coord, y_coord) WHERE x_coord IS NOT NULL` — future xG model queries will filter nulls anyway; index stays small.

**What is NOT in the schema (intentional):**
- Goalie ID — not in the field list provided; add in a later migration if needed for save percentage work.
- Season column — derivable from `game_date`; add if cross-season queries become common.

---

## Integration Points

### New vs. Modified Components

| Item | Status | Action |
|------|--------|--------|
| `app/components/Header.tsx` | NEW | Create shared header with logout button |
| `app/dashboard/loading.tsx` | NEW | Route-level skeleton for dashboard |
| `app/games/loading.tsx` | NEW | Route-level skeleton for games list |
| `app/games/[id]/loading.tsx` | NEW | Route-level skeleton for game detail/edit/mental |
| `app/dashboard/page.tsx` | MODIFIED | Replace inline `<header>` with `<Header />` |
| `app/games/[id]/page.tsx` | MODIFIED | Replace inline `<header>` with `<Header />` |
| `app/games/[id]/edit/page.tsx` | MODIFIED | Replace inline `<header>` with `<Header />` |
| `app/games/[id]/mental/page.tsx` | MODIFIED | Replace inline `<header>` with `<Header />` |
| `app/games/add/page.tsx` | MODIFIED | Replace inline `<header>` with `<Header />` |
| `app/layout.tsx` | DECISION POINT | SessionProvider NOT needed for logout only |
| `data-pipeline/` (entire dir) | NEW | Standalone Python project |
| `data-pipeline/migrations/001_create_nhl_shots.sql` | NEW | Raw DDL for shots table |

### Build Order Within Each Phase

**Phase A — UX Polish:**
1. `app/components/Header.tsx` first — all other page modifications depend on it
2. `app/dashboard/page.tsx` — highest-traffic page, validates the Header component
3. Remaining page modifications — after Header is confirmed working
4. `loading.tsx` files — independent of Header, can be done in parallel with step 2-3
5. UX audit — last, after all above are in place; audit catches remaining gaps

**Phase B — Python Pipeline:**
1. `data-pipeline/migrations/001_create_nhl_shots.sql` — run against Neon first; table must exist before ingest
2. `data-pipeline/config.py` + `requirements.txt` — environment foundation
3. `data-pipeline/ingest/fetch_shots.py` — NHL API client, test against one game
4. `data-pipeline/ingest/transform.py` — field mapping, test with one game's events
5. `data-pipeline/ingest/load.py` — Postgres write, verify idempotency with re-run
6. Full season ingest run
7. `data-pipeline/validate/spot_check.py` — row count + spot-check after full run

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| NextAuth (`/api/auth/signout`) | `signOut()` from `next-auth/react` makes POST | No SessionProvider needed |
| NHL API (`api-web.nhle.com`) | Python `requests` GET per game | Public API, no auth key; rate-limit with sleep between calls |
| Neon Postgres | `psycopg2` or `asyncpg` from Python pipeline | Use `DATABASE_URL_UNPOOLED` (direct connection, not PgBouncer) for bulk inserts |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Next.js app ↔ nhl_shots table | None (v2.0) | Prisma schema does not include nhl_shots; future milestone adds read access |
| data-pipeline ↔ Prisma models | None | Pipeline never touches User, Game, MentalState tables |
| Header component ↔ pages | Props only (title string) | No context, no shared state needed |

---

## Anti-Patterns

### Anti-Pattern 1: Adding SessionProvider for Logout

**What people do:** Wrap `layout.tsx` in `<SessionProvider>` because they see it in NextAuth docs, then use `useSession()` to show user info in the header.

**Why it's wrong for this milestone:** `signOut()` works without SessionProvider. Adding SessionProvider adds a client component wrapper to the root layout, which can cause hydration complexity. Not needed until `useSession()` is actually called somewhere.

**Do this instead:** Call `signOut()` directly. If you later need user name in the header, then add SessionProvider and `useSession()`.

---

### Anti-Pattern 2: Converting Pages to Server Components for loading.tsx

**What people do:** Refactor client component pages to Server Components so that `loading.tsx` covers the async data fetch via `Suspense`.

**Why it's wrong:** All pages use `useEffect` + `useState` because they need browser APIs and interactive mutation states (`isDeleting`, `isConfirming`, etc.). Converting them to Server Components is a significant architectural change that introduces streaming complexity and would require splitting each page into a server shell + multiple client leaf components. Not worth it for this milestone.

**Do this instead:** Keep pages as client components. Use `loading.tsx` only for route-transition skeleton (the 50–300ms gap during navigation). Keep `isLoading` state for the data fetch. Accept the two-layer pattern — it's correct for this architecture.

---

### Anti-Pattern 3: Managing nhl_shots via Prisma

**What people do:** Add the shots table to `schema.prisma` so they get type-safe queries.

**Why it's wrong:** The pipeline runs Python. Prisma is Node.js. Adding a large table to `schema.prisma` also means every `prisma migrate deploy` during Vercel build must account for it, creating coupling between app deploys and pipeline schema changes.

**Do this instead:** Manage `nhl_shots` with raw SQL migrations in `data-pipeline/migrations/`. When the Next.js app eventually needs to query shots (future xG feature), use Prisma's `$queryRaw` or add the model then — don't prematurely add it.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (1 user, ~100 games) | No changes needed — existing architecture handles this easily |
| 50–500 users | Neon's connection pooler (already configured via DATABASE_URL) handles this; no changes needed |
| nhl_shots full season | ~200K–500K rows; current schema with indexes handles analytical queries fine; consider `CLUSTER` on game_date if queries are slow |
| nhl_shots multi-season | Partition by season (PostgreSQL declarative partitioning on game_date); premature now |

---

## Sources

- Next.js App Router loading.tsx docs: https://nextjs.org/docs/app/api-reference/file-conventions/loading
- NextAuth signOut API: https://next-auth.js.org/getting-started/client#signout
- NHL Public API base: `https://api-web.nhle.com/v1/` (no auth required, community-documented)
- Direct code inspection: `app/dashboard/page.tsx`, `middleware.ts`, `prisma/schema.prisma`, `src/lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`

---

*Architecture research for: Hockey Performance Tracker v2.0*
*Researched: 2026-07-07*
