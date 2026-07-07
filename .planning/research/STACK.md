# Stack Research

**Domain:** Hockey performance web app — v2.0 UX polish + Python NHL data pipeline
**Researched:** 2026-07-07
**Confidence:** HIGH (Next.js polish — no new libs), MEDIUM (Python pipeline — community-documented API)

> This file covers ONLY net-new additions for v2.0. The existing stack (Next.js 16, TypeScript, Tailwind 4, NextAuth.js v4, Prisma 6, PostgreSQL/Neon) is validated and unchanged.

---

## Net-New Stack Additions

### Next.js UX Polish — No New Packages

| Capability | Implementation | Why |
|------------|---------------|-----|
| Logout button | `signOut` from `next-auth/react` (already installed) | Built into next-auth v4.24.13 — `signOut({ callbackUrl: '/login' })` in a `'use client'` component |
| Loading skeletons | `loading.tsx` + Tailwind `animate-pulse bg-gray-200` | Next.js App Router wraps `loading.tsx` in Suspense automatically — zero config, no library |
| Granular suspense | `<Suspense fallback={<Skeleton />}>` inside page components | Lets independent data fetches stream without blocking the whole page |
| Spinner (mutation in-flight) | `useState` + Tailwind + lucide-react `Loader2` icon | `lucide-react` already installed (v0.552.0) — `animate-spin` class |

**Verdict:** Zero new npm packages required for UX polish. All primitives already exist in the installed stack.

### Python NHL Data Pipeline — New Python Environment

The pipeline lives at `/data-pipeline/` as a standalone Python project, completely separate from the Next.js app. It reads from `api-web.nhle.com` and writes to the same Neon Postgres instance under a `nhl` schema.

#### Core Technologies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.12+ | Runtime | LTS, type hints, asyncio support |
| `httpx` | `0.28.x` | HTTP client for NHL API | Native async/await, HTTP/2, connection pooling, cleaner than `requests`. For batch scraping 1000+ games, concurrent fetches via `asyncio.gather` with a semaphore are the standard pattern. |
| `psycopg[binary]` | `3.2.x` | PostgreSQL driver | psycopg3 (not v2) — unified sync/async API, recommended for all new Python projects by the psycopg team. Sync mode is sufficient for a batch script; no asyncio overhead needed for DB inserts. |
| `tenacity` | `9.x` | Retry with exponential backoff | Decorator-based retry logic, handles 429/503 cleanly. Separates retry policy from business logic. Preferred over hand-rolled `time.sleep` loops. |
| `python-dotenv` | `1.x` | Load `DATABASE_URL_UNPOOLED` from `.env` | Consistent with how Next.js app loads secrets |

#### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nhl-api-py` | `latest` (maintained for 2025/2026 season) | Typed wrapper around `api-web.nhle.com` | Use if you want typed response objects and don't want to hand-parse JSON. Alternative to raw `httpx` calls. MEDIUM confidence — community-maintained, not official NHL SDK. |
| `tqdm` | `4.x` | Progress bar for season ingestion | Optional — useful when running a full-season backfill (1300+ games) interactively |

---

## Installation

```bash
# No npm changes — Next.js UX polish uses existing packages only

# Python pipeline (run from /data-pipeline/)
pip install httpx==0.28.* psycopg[binary]==3.2.* tenacity==9.* python-dotenv==1.*

# Optional
pip install nhl-api-py tqdm
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `httpx` | `requests` | `requests` is sync-only; httpx provides async for concurrent game fetches without threading boilerplate |
| `httpx` | `aiohttp` | aiohttp is async-only (no sync fallback), heavier API surface, less ergonomic for a standalone script |
| `psycopg[binary]` (v3) | `psycopg2-binary` | psycopg2 is end-of-life for new projects; psycopg3 is the official successor with better async support and type hints |
| `psycopg[binary]` (v3) | `asyncpg` | asyncpg is ~5x faster at high concurrency, but requires asyncio throughout. Overkill for a batch insert script; adds complexity with no practical benefit at pipeline scale |
| `tenacity` | hand-rolled backoff | `time.sleep` loops in `while True` blocks lack structured stop conditions, jitter, and logging |
| Tailwind `animate-pulse` skeletons | `react-loading-skeleton` | Extra dependency, extra bundle size, same visual result achievable with 3 Tailwind classes |
| `loading.tsx` + Suspense | `SWR`/`TanStack Query` loading states | SWR/TQ are correct for client-side fetching apps; this app uses RSC + server fetching where `loading.tsx` is the idiomatic primitive |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-loading-skeleton` | Unnecessary dependency — same effect with `animate-pulse bg-gray-200 rounded` in Tailwind | Tailwind utility classes |
| `axios` | Larger bundle, no meaningful advantage over httpx for a Python pipeline | `httpx` |
| `SQLAlchemy` | Heavy ORM for a pipeline that only needs bulk inserts into one schema | `psycopg` with raw SQL `COPY` or `executemany` |
| `asyncpg` | asyncio-only, no sync path, complex for a batch script | `psycopg[binary]` v3 |
| `psycopg2` | End-of-life for new projects | `psycopg[binary]` v3 |
| Auth.js v5 / NextAuth v5 | Breaking API change; project uses next-auth v4 stable and shipping in production | Stay on next-auth v4.24.x |

---

## Integration Points with Existing Stack

### Database Connection

The Python pipeline must use `DATABASE_URL_UNPOOLED` (the Neon direct connection string), **not** the pooled `DATABASE_URL`. PgBouncer (Neon's pooler) drops prepared statements and is unsuitable for bulk inserts or schema migrations from external scripts.

The pipeline writes to a **`nhl` schema** in the same Neon Postgres database:

```sql
-- Pipeline creates this schema on first run
CREATE SCHEMA IF NOT EXISTS nhl;
CREATE TABLE IF NOT EXISTS nhl.shot_events (...);
```

This isolates NHL data from the `public` schema used by Prisma, preventing migration conflicts.

### Environment Variables

The pipeline `.env` reuses the existing Vercel secret:

```
DATABASE_URL_UNPOOLED=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
```

No new secrets needed — the `DATABASE_URL_UNPOOLED` is already provisioned in Vercel dashboard from v1.0.

### NHL API Rate Limiting

`api-web.nhle.com` has no published rate limit, but community practice (MEDIUM confidence) is to stay under ~5 req/s for play-by-play endpoints. The recommended pattern:

```python
import asyncio, httpx
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

SEMAPHORE = asyncio.Semaphore(5)  # max 5 concurrent requests

@retry(
    retry=retry_if_exception_type(httpx.HTTPStatusError),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(5)
)
async def fetch_game(client: httpx.AsyncClient, game_id: int) -> dict:
    async with SEMAPHORE:
        r = await client.get(f"https://api-web.nhle.com/v1/gamecenter/{game_id}/play-by-play")
        r.raise_for_status()
        return r.json()
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `next-auth` v4.24.13 | `next` 16.0.1 | Already installed and shipping — do NOT upgrade to v5 (breaking API) |
| `psycopg[binary]` 3.2.x | Python 3.12, Neon Postgres 16 | `[binary]` extras avoid compiling C extensions; `sslmode=require` in connection string |
| `httpx` 0.28.x | Python 3.12, `tenacity` 9.x | No known conflicts |
| `tenacity` 9.x | `httpx` async clients | Use `retry_if_exception_type(httpx.HTTPStatusError)` for 429/503 |

---

## Sources

- [NextAuth.js Client API — signOut](https://next-auth.js.org/getting-started/client) — signOut function signature and options (HIGH confidence)
- [Next.js loading.js file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/loading) — App Router Suspense wrapping behavior (HIGH confidence)
- [Next.js Streaming Guide](https://nextjs.org/docs/app/guides/streaming) — Granular Suspense patterns (HIGH confidence)
- [NHL API Reference — Zmalski](https://github.com/Zmalski/NHL-API-Reference) — Unofficial but comprehensive endpoint docs including `api-web.nhle.com/v1/gamecenter/{gameId}/play-by-play` (MEDIUM confidence — community-maintained)
- [nhl-api-py PyPI](https://pypi.org/project/nhl-api-py/) / [GitHub](https://github.com/coreyjs/nhl-api-py) — 2025/2026 updated Python wrapper (MEDIUM confidence)
- [psycopg3 vs psycopg2 performance benchmark — Tiger Data](https://www.tigerdata.com/blog/psycopg2-vs-psycopg3-performance-benchmark) — psycopg3 recommended for new projects (MEDIUM confidence)
- [Neon Python connection guide](https://neon.com/docs/guides/python) — DATABASE_URL_UNPOOLED for direct connections (HIGH confidence)
- [tenacity exponential backoff for rate-limited APIs — DEV Community](https://dev.to/137foundry/how-to-implement-exponential-backoff-for-rate-limited-apis-in-python-28b5) — Retry decorator pattern (MEDIUM confidence)
- [HTTPX vs Requests vs AIOHTTP — Decodo](https://decodo.com/blog/httpx-vs-requests-vs-aiohttp) — httpx async advantage for concurrent fetches (MEDIUM confidence)

---

*Stack research for: Hockey Performance Tracker v2.0 — UX Polish + NHL Pipeline*
*Researched: 2026-07-07*
