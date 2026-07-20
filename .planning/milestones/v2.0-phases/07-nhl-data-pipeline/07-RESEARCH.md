# Phase 7: NHL Data Pipeline - Research

**Researched:** 2026-07-18
**Domain:** NHL unofficial API, Python data pipeline, psycopg3 batch insert, tenacity retry
**Confidence:** MEDIUM (API is unofficial and undocumented; all findings are from community sources cross-referenced against multiple independent sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Shot Event Schema** — `nhl_raw.shot_events` columns:
- `game_id` (INTEGER), `event_id` (INTEGER), `period` (SMALLINT), `period_time` (VARCHAR),
  `event_type` (VARCHAR), `shot_type` (VARCHAR), `x_coord` (SMALLINT), `y_coord` (SMALLINT),
  `shooter_id` (INTEGER), `shooter_name` (VARCHAR), `inserted_at` (TIMESTAMPTZ DEFAULT NOW())
- Primary key: `(game_id, event_id)` — idempotent upsert via `ON CONFLICT DO NOTHING`
- Schema: `nhl_raw` (separate from public)

**Season Configuration:**
- CLI arg: `python ingest.py --season 20242025`
- Format: YYYYYYYY (e.g., `20242025` for 2024-25)
- Scope: regular season only (gameType=2); excludes preseason (1) and playoffs (3)
- Date range walked day by day via NHL schedule endpoint

**Validation Output:**
- Progress every N games: `[150/1312] 11% — 12,345 shots ingested so far`
- Post-run summary block to stdout (season, games processed, shots inserted, failed games, final row count)
- Verification: manual spot-check only, no automated comparison script

**Retry & Error Handling:**
- Rate limit: ~1 req/sec between API calls (sequential, no concurrency)
- Retry on 429/503: exponential backoff via tenacity (3 retries before giving up on that game)
- Failed games: logged and skipped; appear in final summary

**Project Structure:**
```
/data-pipeline/
  ingest.py         # single main script
  requirements.txt  # httpx, psycopg[binary], tenacity, python-dotenv
  .env              # gitignored — DATABASE_URL_UNPOOLED
  .env.example      # committed
  README.md
```

**Libraries:** httpx (HTTP), psycopg (psycopg3) (DB), tenacity (retries), python-dotenv (config)

### Claude's Discretion

- Exact progress interval (every 50 games, every 100, etc.)
- Failed game ID formatting in the summary
- SQL DDL for schema/table creation (idempotent `CREATE SCHEMA IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS`)
- Exact tenacity retry configuration (wait multiplier, max attempts)
- Whether to print a schema creation notice on first run

### Deferred Ideas (OUT OF SCOPE)

- PIPE-05: Checkpoint/resume manifest (`pipeline_runs` table)
- PIPE-06: Scheduled pipeline execution via GitHub Actions cron
- PIPE-07: xG model training and scoring on ingested data
- Multi-season loop (`--start-season` / `--end-season` flags)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Pipeline walks a full NHL season's date range and collects all gameIds via the schedule endpoint | Schedule endpoint confirmed: `/v1/schedule/{YYYY-MM-DD}` → `gameWeek[].games[].id`; filter `gameType==2`; 2024-25 date range Oct 4, 2024–Apr 17, 2025 |
| PIPE-02 | Pipeline fetches play-by-play for each game and filters to shot events (shot-on-goal, goal, missed-shot, blocked-shot) | Play-by-play endpoint confirmed: `/v1/gamecenter/{game_id}/play-by-play` → `plays[]`; filter on `typeDescKey` in `{"shot-on-goal","goal","missed-shot","blocked-shot"}`; all field names documented below |
| PIPE-03 | Pipeline inserts shot events into `nhl_raw.shot_events` in Postgres with idempotent upsert | psycopg3 `executemany` + `ON CONFLICT (game_id, event_id) DO NOTHING` pattern confirmed; Neon direct connection via DATABASE_URL_UNPOOLED confirmed |
| PIPE-04 | Rate-limits (~1 req/sec), retries on 429/503 with exponential backoff, logs failed games, outputs post-ingestion row count | tenacity `@retry(stop_after_attempt(3), wait_exponential, retry_if_exception)` pattern confirmed; `time.sleep(1)` between requests; final `SELECT COUNT(*)` for row count |
</phase_requirements>

---

## Summary

The NHL currently exposes an unofficial, undocumented JSON API at `api-web.nhle.com/v1/`. This replaced the older `statsapi.web.nhl.com` API (which is now archived/unreliable). There is no official developer portal, no API key, and no published rate limits. The community consensus threshold of ~1 req/sec has been validated empirically by multiple open-source hockey data projects over several seasons.

The play-by-play endpoint at `/v1/gamecenter/{game_id}/play-by-play` returns a `plays` array where each event has typed fields including `typeDescKey` (string event name), `periodDescriptor.number` (period), `timeInPeriod` (clock string), and a `details` sub-object holding coordinates and player IDs. The same response includes a `rosterSpots` array for player name lookups, eliminating the need for additional API calls to resolve `shooter_name`.

The 2024-25 regular season ran October 4, 2024 to April 17, 2025 with exactly 1,312 games (game IDs `2024020001`–`2024021312`). Walking the schedule endpoint day-by-day and collecting `gameType==2` game IDs into a Python set is the recommended approach — the set deduplicates naturally if the `gameWeek` response spans multiple days.

**Primary recommendation:** Use the `api-web.nhle.com/v1/` API exclusively (not the old statsapi). Map `rosterSpots` to a dict at game parse time for zero-cost player name lookups. Use `psycopg3 executemany` for batch inserts. Wrap every API call with tenacity retry.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | >=0.27 | HTTP client for NHL API requests | Modern sync/async client; cleaner API than requests; locked project decision |
| psycopg[binary] | >=3.1 | Direct Postgres connection to Neon | psycopg3 (not psycopg2); raw SQL, no ORM; locked project decision |
| tenacity | >=8.2 | Retry decorator for 429/503 handling | Standard Python retry library; clean decorator API; locked project decision |
| python-dotenv | >=1.0 | Load DATABASE_URL_UNPOOLED from .env | Config hygiene; locked project decision |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| argparse | stdlib | Parse `--season` CLI argument | Built-in; no install needed |
| time | stdlib | `time.sleep(1)` rate limiting | Built-in delay between requests |
| datetime / date | stdlib | Date range iteration (Oct 4 → Apr 17) | Day-by-day schedule walk |

**Installation:**
```bash
pip install httpx "psycopg[binary]" tenacity python-dotenv
```

---

## Architecture Patterns

### Recommended Project Structure
```
data-pipeline/
├── ingest.py         # single script (~300 lines): main(), fetch_schedule(), fetch_game_pbp(), ingest_game(), create_schema()
├── requirements.txt  # httpx, psycopg[binary], tenacity, python-dotenv
├── .env              # gitignored — DATABASE_URL_UNPOOLED=postgresql://...
├── .env.example      # committed — DATABASE_URL_UNPOOLED=postgresql://user:pass@host/db?sslmode=require
└── README.md         # usage: python ingest.py --season 20242025
```

### Pattern 1: Schedule Walk — Collect Regular Season Game IDs
**What:** Call the schedule endpoint for each day in the season date range; filter for `gameType==2`; accumulate game IDs into a set (deduplicates if `gameWeek` spans multiple days).
**When to use:** Always — this is the only supported way to enumerate season games.

```python
# Source: community-verified against https://github.com/Zmalski/NHL-API-Reference
from datetime import date, timedelta
import httpx

NHL_BASE = "https://api-web.nhle.com/v1"
SEASON_DATES = {
    "20242025": ("2024-10-04", "2025-04-17"),
}

def fetch_game_ids(season: str) -> list[int]:
    start_str, end_str = SEASON_DATES[season]
    start = date.fromisoformat(start_str)
    end = date.fromisoformat(end_str)
    game_ids: set[int] = set()
    current = start
    while current <= end:
        url = f"{NHL_BASE}/schedule/{current.isoformat()}"
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        for day in data.get("gameWeek", []):
            for game in day.get("games", []):
                if game.get("gameType") == 2:
                    game_ids.add(game["id"])
        current += timedelta(days=1)
        time.sleep(1)
    return sorted(game_ids)
```

**Note:** `gameWeek` may contain games from surrounding days (it appears to return a week-view). Walking day-by-day with a set naturally deduplicates. If performance matters, advance by 7 days and process each `gameWeek` entry; the set handles deduplication either way.

### Pattern 2: Play-by-Play Fetch and Shot Extraction
**What:** Fetch the PBP endpoint for a game; build a player-name lookup dict from `rosterSpots`; filter `plays` by `typeDescKey`; map fields to the schema columns.
**When to use:** For every game_id collected in the schedule walk.

```python
# Source: community-verified field names from multiple NHL analytics projects
SHOT_EVENT_TYPES = {"shot-on-goal", "goal", "missed-shot", "blocked-shot"}

def fetch_game_shots(game_id: int) -> list[dict]:
    url = f"{NHL_BASE}/gamecenter/{game_id}/play-by-play"
    resp = httpx.get(url, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    # Build player name lookup from rosterSpots (avoids extra API calls)
    player_names: dict[int, str] = {}
    for spot in data.get("rosterSpots", []):
        pid = spot.get("playerId")
        first = spot.get("firstName", {}).get("default", "")
        last = spot.get("lastName", {}).get("default", "")
        if pid:
            player_names[pid] = f"{first} {last}".strip()

    shots = []
    for play in data.get("plays", []):
        if play.get("typeDescKey") not in SHOT_EVENT_TYPES:
            continue
        details = play.get("details") or {}
        period_desc = play.get("periodDescriptor") or {}

        # Goals use scoringPlayerId; all others use shootingPlayerId
        shooter_id = details.get("shootingPlayerId") or details.get("scoringPlayerId")

        shots.append({
            "game_id": game_id,
            "event_id": play.get("eventId"),
            "period": period_desc.get("number"),
            "period_time": play.get("timeInPeriod"),
            "event_type": play.get("typeDescKey"),
            "shot_type": details.get("shotType"),  # may be None for blocked-shot
            "x_coord": details.get("xCoord"),
            "y_coord": details.get("yCoord"),
            "shooter_id": shooter_id,
            "shooter_name": player_names.get(shooter_id) if shooter_id else None,
        })
    return shots
```

### Pattern 3: Tenacity Retry Decorator
**What:** Wrap every NHL API call in a retry decorator that retries on 429/503 with exponential backoff.
**When to use:** Applied to any function that calls httpx.get against the NHL API.

```python
# Source: https://tenacity.readthedocs.io/en/stable/
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception
import httpx

def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    if isinstance(exc, (httpx.ConnectError, httpx.TimeoutException)):
        return True
    return False

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    retry=retry_if_exception(_is_retryable),
    reraise=True,  # re-raise after max attempts so caller can catch and skip
)
def _get_json(url: str) -> dict:
    resp = httpx.get(url, timeout=15)
    resp.raise_for_status()
    return resp.json()
```

**Caller pattern:** Wrap the game fetch in a try/except so failed games are logged and skipped, not crashing the run:
```python
failed_games = []
for game_id in game_ids:
    try:
        shots = fetch_game_shots(game_id)
        ingest_shots(conn, shots)
    except Exception as e:
        failed_games.append(game_id)
        print(f"[SKIP] game {game_id}: {e}")
    time.sleep(1)
```

### Pattern 4: psycopg3 Batch Insert with ON CONFLICT DO NOTHING
**What:** Batch insert rows using `executemany`; the `ON CONFLICT DO NOTHING` clause makes re-runs idempotent.
**When to use:** All shot event inserts.

```python
# Source: https://www.psycopg.org/psycopg3/docs/basic/usage.html
import psycopg

INSERT_SQL = """
INSERT INTO nhl_raw.shot_events (
    game_id, event_id, period, period_time, event_type,
    shot_type, x_coord, y_coord, shooter_id, shooter_name
) VALUES (
    %(game_id)s, %(event_id)s, %(period)s, %(period_time)s, %(event_type)s,
    %(shot_type)s, %(x_coord)s, %(y_coord)s, %(shooter_id)s, %(shooter_name)s
)
ON CONFLICT (game_id, event_id) DO NOTHING
"""

def ingest_shots(conn: psycopg.Connection, shots: list[dict]) -> int:
    if not shots:
        return 0
    with conn.cursor() as cur:
        cur.executemany(INSERT_SQL, shots)
    conn.commit()
    return len(shots)
```

### Pattern 5: Schema + Table DDL (Idempotent)

```python
CREATE_DDL = """
CREATE SCHEMA IF NOT EXISTS nhl_raw;

CREATE TABLE IF NOT EXISTS nhl_raw.shot_events (
    game_id       INTEGER      NOT NULL,
    event_id      INTEGER      NOT NULL,
    period        SMALLINT,
    period_time   VARCHAR(10),
    event_type    VARCHAR(30),
    shot_type     VARCHAR(30),
    x_coord       SMALLINT,
    y_coord       SMALLINT,
    shooter_id    INTEGER,
    shooter_name  VARCHAR(100),
    inserted_at   TIMESTAMPTZ  DEFAULT NOW(),
    PRIMARY KEY (game_id, event_id)
);
"""

def create_schema(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(CREATE_DDL)
    conn.commit()
```

### Anti-Patterns to Avoid

- **Using the old API:** `statsapi.web.nhl.com` is archived and unreliable. Use `api-web.nhle.com/v1/` only.
- **Concurrent requests:** No async/threading against the NHL API. Sequential + sleep is the only safe approach at full-season scale.
- **Using an ORM (SQLAlchemy):** Raw psycopg3 is correct weight for a batch insert script. This is a locked project decision.
- **Assuming `details` fields are always present:** Many event fields in `details` can be null. Always use `.get()` with a fallback.
- **Using `conn.autocommit = True`:** Commit per-game (after `executemany` for that game's shots), not per-row and not at the very end of the full run. This limits re-run waste if the process dies mid-run.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retry with backoff | Custom retry loop with sleep | tenacity `@retry` | Handles jitter, reraise, max-attempts, exception filtering cleanly |
| Rate limiting | Custom token bucket or leaky bucket | `time.sleep(1)` | Sequential fetching needs only a simple sleep; a framework is overkill |
| Batch SQL insert | Single-row `execute` in a loop | `cursor.executemany` | psycopg3 batches these natively; single-row loop is ~50x slower |
| Player name resolution | Separate API calls per player | `rosterSpots` in PBP response | Player info is already in the PBP payload; no extra requests needed |
| Date iteration | Custom date arithmetic | `datetime.date` + `timedelta(days=1)` | Standard library covers this completely |

**Key insight:** The PBP response includes `rosterSpots` with player names. Build a `{player_id: name}` dict once per game; look up names during event parsing. Zero extra API calls.

---

## NHL API Contract

### Confirmed Endpoints (MEDIUM confidence — community-verified, not official docs)

| Endpoint | Purpose | Notes |
|----------|---------|-------|
| `GET /v1/schedule/{YYYY-MM-DD}` | Get games for date window | Returns `gameWeek` array (may span multiple days) |
| `GET /v1/gamecenter/{game_id}/play-by-play` | All events for a game | Returns `plays[]` + `rosterSpots[]` |

**Base URL:** `https://api-web.nhle.com`

### Schedule Response Structure
```
{
  "gameWeek": [
    {
      "date": "2024-10-08",
      "dayAbbrev": "TUE",
      "numberOfGames": 4,
      "games": [
        {
          "id": 2024020001,       ← game_id (integer)
          "gameType": 2,          ← 1=pre, 2=regular, 3=playoffs, 4=all-star
          "gameDate": "2024-10-08",
          "startTimeUTC": "...",
          "gameState": "OFF",
          "homeTeam": { "id": 22, "abbrev": "EDM", ... },
          "awayTeam": { "id": 14, "abbrev": "PHI", ... }
        }
      ]
    }
  ]
}
```

### Play-by-Play Response Structure
```
{
  "id": 2024020001,
  "season": 20242025,
  "gameType": 2,
  "rosterSpots": [
    {
      "playerId": 8478402,
      "teamId": 22,
      "firstName": {"default": "Connor"},
      "lastName": {"default": "McDavid"},
      "positionCode": "C"
    }
  ],
  "plays": [
    {
      "eventId": 47,                    ← event_id
      "typeCode": 506,                  ← numeric code
      "typeDescKey": "shot-on-goal",    ← string event type (filter on this)
      "sortOrder": 93,
      "timeInPeriod": "14:32",          ← period_time (MM:SS format)
      "timeRemaining": "05:28",
      "situationCode": "1551",
      "homeScore": 0,
      "awayScore": 0,
      "periodDescriptor": {
        "number": 1,                    ← period (SMALLINT)
        "periodType": "REG",            ← "REG", "OT", "SO"
        "maxRegulationPeriods": 3
      },
      "details": {
        "xCoord": 45,                   ← x_coord (range: -100 to 100)
        "yCoord": -12,                  ← y_coord (range: -43 to 43)
        "zoneCode": "O",                ← "O"=offensive, "N"=neutral, "D"=defensive
        "shotType": "wrist",            ← shot_type (see values below)
        "shootingPlayerId": 8478402,    ← shooter_id (absent on goal events)
        "scoringPlayerId": null,        ← present on goal events instead
        "blockingPlayerId": null,       ← present on blocked-shot events
        "goalieInNetId": 8476945,
        "homeTeamDefendingSide": "right"
      }
    }
  ]
}
```

### Event Type Codes (MEDIUM confidence — community-verified)
| typeCode | typeDescKey | Pipeline relevance |
|----------|-------------|-------------------|
| 505 | goal | YES — include |
| 506 | shot-on-goal | YES — include |
| 507 | missed-shot | YES — include |
| 508 | blocked-shot | YES — include |
| 502 | faceoff | skip |
| 503 | hit | skip |
| 504 | giveaway | skip |
| 509 | penalty | skip |
| 516 | stoppage | skip |
| 520 | period-start | skip |
| 521 | period-end | skip |
| 525 | takeaway | skip |

### Shot Type Values (MEDIUM confidence)
`wrist`, `tip-in`, `snap`, `slap`, `poke`, `backhand`, `bat`, `deflected`, `wrap-around`, `between-legs`, `cradle`

Note: `shot_type` may be `null` for `blocked-shot` events and occasionally for other types. The column must accept NULL.

### 2024-25 Season Facts
| Property | Value | Source |
|----------|-------|--------|
| Season code | `20242025` | NHL API format YYYYYYYY |
| Regular season start | October 4, 2024 | Wikipedia / NHL.com |
| Regular season end | April 17, 2025 | Wikipedia / NHL.com |
| Total regular season games | 1,312 | Wikipedia confirmed |
| Game ID range | `2024020001` – `2024021312` | Game ID format: YYYY+02+NNNN |

### NHL Game ID Format
```
2024  02  0001
^^^^  ^^  ^^^^
│     │   └── Game number within type (0001–1312 for 2024-25 regular season)
│     └──── Game type (01=pre, 02=regular, 03=playoffs, 04=all-star)
└────────── Season start year (4 digits)
```

---

## Common Pitfalls

### Pitfall 1: `goal` Events Use `scoringPlayerId` Not `shootingPlayerId`
**What goes wrong:** Filtering for `details.shootingPlayerId` misses goals — the `details` for goal events uses `scoringPlayerId` for the player who scored.
**Why it happens:** The API uses different field names for the scorer vs. the shooter on shot attempts.
**How to avoid:** `shooter_id = details.get("shootingPlayerId") or details.get("scoringPlayerId")`
**Warning signs:** All goal events have `shooter_id = NULL` in the database.

### Pitfall 2: `details` Can Be None/Absent
**What goes wrong:** `play["details"]["xCoord"]` raises `KeyError` or `TypeError` for non-shot events that slip through.
**Why it happens:** Some event types have no `details` sub-object at all; others have an incomplete details.
**How to avoid:** Always `details = play.get("details") or {}` before accessing sub-fields.
**Warning signs:** `TypeError: 'NoneType' object is not subscriptable` during a run.

### Pitfall 3: `gameWeek` Returns Multiple Days
**What goes wrong:** Iterating day-by-day and processing all `gameWeek` entries results in the same game ID being added to the list multiple times.
**Why it happens:** The schedule endpoint returns a week-view, not a single day. Calling for Oct 8 may return Oct 7–13.
**How to avoid:** Accumulate game IDs into a Python `set()`, not a list. The set deduplicates automatically.
**Warning signs:** `len(game_ids) > 1312` for the 2024-25 season.

### Pitfall 4: The Old NHL API Is Dead
**What goes wrong:** Using `statsapi.web.nhl.com` returns errors or empty data.
**Why it happens:** NHL replaced the old API in 2023 with `api-web.nhle.com`. Old community tutorials still reference the old URL.
**How to avoid:** Always use `https://api-web.nhle.com/v1/` as the base URL.
**Warning signs:** 404 or authentication errors on any request to `statsapi.web.nhl.com`.

### Pitfall 5: `psycopg[binary]` vs `psycopg` vs `psycopg2`
**What goes wrong:** Installing just `psycopg` (pure Python) works but is significantly slower for bulk inserts. Installing `psycopg2` uses the old v2 API.
**Why it happens:** Three distinct packages with similar names.
**How to avoid:** `pip install "psycopg[binary]"` for the psycopg3 library with compiled C extensions.
**Warning signs:** `import psycopg2` in code (wrong library) or very slow inserts (pure Python psycopg3).

### Pitfall 6: Neon Connection String Must Include SSL Parameters
**What goes wrong:** A connection string without `sslmode=require` fails on Neon.
**Why it happens:** Neon requires SSL for all connections. The raw DATABASE_URL from Neon's dashboard includes these params, but a manually constructed URL might omit them.
**How to avoid:** Use the `DATABASE_URL_UNPOOLED` value exactly as copied from Neon's dashboard. It already contains `sslmode=require`.
**Warning signs:** `SSL connection is required` error on connect.

### Pitfall 7: `blocked-shot` Shooter vs. Blocker
**What goes wrong:** Treating `blockingPlayerId` as the shot-taker for blocked-shot events.
**Why it happens:** The event is named after the blocker from a game summary perspective, but for shot analytics we want the shooter.
**How to avoid:** For `blocked-shot` events, `shootingPlayerId` is the player who shot the puck (got blocked). `blockingPlayerId` is the defender. Store `shootingPlayerId` as `shooter_id`.

### Pitfall 8: Shootout Shots Are Regular Season But Wrong Period Type
**What goes wrong:** Including shootout shot attempts inflates coordinates (they all happen at `xCoord≈89`).
**Why it happens:** Shootout events have `periodDescriptor.periodType == "SO"` and are part of regular season games.
**How to avoid:** For the shot data use case this likely does not matter (coordinates are still valid), but if normalizing by period: filter `periodType != "SO"` or handle it separately. **This is not a current requirement** — noted for future xG model work.

---

## Neon + psycopg3 Connection

```python
# Source: https://neon.com/docs/guides/python
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()  # loads DATABASE_URL_UNPOOLED from .env

def get_connection() -> psycopg.Connection:
    conn_str = os.environ["DATABASE_URL_UNPOOLED"]
    # Neon's URL already includes ?sslmode=require&channel_binding=require
    return psycopg.connect(conn_str)
```

**Connection string format from Neon:**
```
postgresql://user:password@ep-cool-id-123456.us-east-2.aws.neon.tech/dbname?sslmode=require&channel_binding=require
```

**Key psycopg3 behaviors to know:**
- `with psycopg.connect(...) as conn:` — auto-commits on `__exit__` only if no exception; rolls back on exception
- `conn.commit()` must be called explicitly outside `with` blocks, or use `autocommit=True`
- `executemany(sql, list_of_dicts)` works with named params (`%(name)s` syntax)
- For batch inserts, psycopg3's `executemany` is efficient (uses server-side batching internally)

---

## Code Examples

### Full Main Script Skeleton

```python
#!/usr/bin/env python3
"""NHL shot event data pipeline. Usage: python ingest.py --season 20242025"""

import argparse
import os
import time
from datetime import date, timedelta

import httpx
import psycopg
from dotenv import load_dotenv
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

load_dotenv()

NHL_BASE = "https://api-web.nhle.com/v1"
SHOT_TYPES = {"shot-on-goal", "goal", "missed-shot", "blocked-shot"}
SEASON_DATES = {
    "20242025": ("2024-10-04", "2025-04-17"),
}

def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    return isinstance(exc, (httpx.ConnectError, httpx.TimeoutException))

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    retry=retry_if_exception(_is_retryable),
    reraise=True,
)
def _get(url: str) -> dict:
    resp = httpx.get(url, timeout=15)
    resp.raise_for_status()
    return resp.json()

def fetch_game_ids(season: str) -> list[int]:
    start_str, end_str = SEASON_DATES[season]
    start = date.fromisoformat(start_str)
    end = date.fromisoformat(end_str)
    game_ids: set[int] = set()
    current = start
    while current <= end:
        data = _get(f"{NHL_BASE}/schedule/{current.isoformat()}")
        for day in data.get("gameWeek", []):
            for game in day.get("games", []):
                if game.get("gameType") == 2:
                    game_ids.add(game["id"])
        current += timedelta(days=1)
        time.sleep(1)
    return sorted(game_ids)

def fetch_shots(game_id: int) -> list[dict]:
    data = _get(f"{NHL_BASE}/gamecenter/{game_id}/play-by-play")
    player_names = {
        spot["playerId"]: (
            spot.get("firstName", {}).get("default", "") + " " +
            spot.get("lastName", {}).get("default", "")
        ).strip()
        for spot in data.get("rosterSpots", [])
        if "playerId" in spot
    }
    shots = []
    for play in data.get("plays", []):
        if play.get("typeDescKey") not in SHOT_TYPES:
            continue
        d = play.get("details") or {}
        pd = play.get("periodDescriptor") or {}
        sid = d.get("shootingPlayerId") or d.get("scoringPlayerId")
        shots.append({
            "game_id": game_id,
            "event_id": play.get("eventId"),
            "period": pd.get("number"),
            "period_time": play.get("timeInPeriod"),
            "event_type": play.get("typeDescKey"),
            "shot_type": d.get("shotType"),
            "x_coord": d.get("xCoord"),
            "y_coord": d.get("yCoord"),
            "shooter_id": sid,
            "shooter_name": player_names.get(sid) if sid else None,
        })
    return shots

CREATE_DDL = """
CREATE SCHEMA IF NOT EXISTS nhl_raw;
CREATE TABLE IF NOT EXISTS nhl_raw.shot_events (
    game_id      INTEGER      NOT NULL,
    event_id     INTEGER      NOT NULL,
    period       SMALLINT,
    period_time  VARCHAR(10),
    event_type   VARCHAR(30),
    shot_type    VARCHAR(30),
    x_coord      SMALLINT,
    y_coord      SMALLINT,
    shooter_id   INTEGER,
    shooter_name VARCHAR(100),
    inserted_at  TIMESTAMPTZ  DEFAULT NOW(),
    PRIMARY KEY (game_id, event_id)
);
"""

INSERT_SQL = """
INSERT INTO nhl_raw.shot_events
    (game_id, event_id, period, period_time, event_type,
     shot_type, x_coord, y_coord, shooter_id, shooter_name)
VALUES
    (%(game_id)s, %(event_id)s, %(period)s, %(period_time)s, %(event_type)s,
     %(shot_type)s, %(x_coord)s, %(y_coord)s, %(shooter_id)s, %(shooter_name)s)
ON CONFLICT (game_id, event_id) DO NOTHING
"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", required=True)
    args = parser.parse_args()
    season = args.season

    conn = psycopg.connect(os.environ["DATABASE_URL_UNPOOLED"])
    with conn.cursor() as cur:
        cur.execute(CREATE_DDL)
    conn.commit()

    game_ids = fetch_game_ids(season)
    total = len(game_ids)
    total_shots = 0
    failed = []

    for i, gid in enumerate(game_ids, 1):
        try:
            shots = fetch_shots(gid)
            if shots:
                with conn.cursor() as cur:
                    cur.executemany(INSERT_SQL, shots)
                conn.commit()
                total_shots += len(shots)
        except Exception as e:
            failed.append(gid)
            print(f"[SKIP] {gid}: {e}")
        if i % 50 == 0:
            print(f"[{i}/{total}] {i*100//total}% — {total_shots:,} shots ingested so far")
        time.sleep(1)

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM nhl_raw.shot_events")
        final_count = cur.fetchone()[0]
    conn.close()

    print(f"\n=== NHL Data Pipeline Complete ===")
    print(f"Season:              {season}")
    print(f"Games processed:     {total - len(failed)}")
    print(f"Shot events inserted:{total_shots:,}")
    if failed:
        print(f"Failed games:        {len(failed)} (game IDs: {', '.join(str(g) for g in failed)})")
    else:
        print(f"Failed games:        0")
    print(f"Final row count:     {final_count:,} (from nhl_raw.shot_events)")

if __name__ == "__main__":
    main()
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `statsapi.web.nhl.com/api/v1/` | `api-web.nhle.com/v1/` | ~2023 | Old API is archived; use new API only |
| `psycopg2` | `psycopg` (v3) with `[binary]` extra | Project decision | psycopg3 has cleaner context manager behavior and better executemany performance |
| `requests` library | `httpx` | Project decision | httpx has cleaner API; can be used sync or async without code changes |

**Deprecated/outdated:**
- `statsapi.web.nhl.com`: Old NHL Stats API. Still returns some data but unreliable; community has migrated to `api-web.nhle.com`. Do NOT use.
- `psycopg2`: The `psycopg` (v3) package is a distinct import and API. Do not mix with psycopg2 patterns (e.g., `extras.execute_values` from psycopg2 does not exist in psycopg3).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (not yet installed in /data-pipeline — Wave 0 task) |
| Config file | none — see Wave 0 |
| Quick run command | `cd data-pipeline && python -m pytest tests/ -x -q` |
| Full suite command | `cd data-pipeline && python -m pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Schedule walk collects exactly N game IDs for a known date range; filters out non-regular-season games | unit (mock httpx) | `pytest tests/test_schedule.py -x` | Wave 0 |
| PIPE-01 | `gameType != 2` games are excluded from collection | unit (mock httpx) | `pytest tests/test_schedule.py::test_filters_non_regular_season -x` | Wave 0 |
| PIPE-02 | Shot events are extracted from a known PBP fixture; non-shot events are filtered out | unit (fixture JSON) | `pytest tests/test_pbp.py::test_shot_extraction -x` | Wave 0 |
| PIPE-02 | Goal events use `scoringPlayerId` fallback; blocked-shot events use `shootingPlayerId` | unit (fixture JSON) | `pytest tests/test_pbp.py::test_player_id_fallback -x` | Wave 0 |
| PIPE-02 | `details` being null/absent does not raise an exception | unit | `pytest tests/test_pbp.py::test_null_details -x` | Wave 0 |
| PIPE-03 | Re-running ingest on the same game_ids does not increase row count | integration (test DB) | `pytest tests/test_idempotency.py -x` | Wave 0 |
| PIPE-04 | 429/503 responses trigger retry; final failure after 3 attempts logs the game and continues | unit (mock httpx) | `pytest tests/test_retry.py -x` | Wave 0 |

**Manual-only verification (not automatable):**
- Run `python ingest.py --season 20242025` against real Neon DB and verify final row count matches expectation
- Spot-check 2-3 game IDs by comparing shot counts in DB against NHL.com game logs

### Idempotency Verification Pattern

```python
# tests/test_idempotency.py (conceptual pattern)
def test_no_duplicates_on_rerun(test_db_conn, sample_shots):
    ingest_shots(test_db_conn, sample_shots)
    count_after_first = get_row_count(test_db_conn)
    
    ingest_shots(test_db_conn, sample_shots)  # re-run same data
    count_after_second = get_row_count(test_db_conn)
    
    assert count_after_first == count_after_second  # ON CONFLICT DO NOTHING
```

### Row Count Validation (Post-Run)

The pipeline queries `SELECT COUNT(*) FROM nhl_raw.shot_events` after the run. Cross-reference this against community-reported shot totals for the 2024-25 season. Expected range: ~85,000–95,000 shot events for a full regular season (all four shot event types combined across 1,312 games, averaging ~65–72 shot attempts per game).

### Wave 0 Gaps
- [ ] `data-pipeline/tests/__init__.py` — test package init
- [ ] `data-pipeline/tests/test_schedule.py` — covers PIPE-01
- [ ] `data-pipeline/tests/test_pbp.py` — covers PIPE-02
- [ ] `data-pipeline/tests/test_retry.py` — covers PIPE-04
- [ ] `data-pipeline/tests/test_idempotency.py` — covers PIPE-03
- [ ] `data-pipeline/tests/fixtures/sample_pbp.json` — real PBP response saved for unit tests
- [ ] Framework install: `pip install pytest pytest-mock` — no existing test infrastructure detected in /data-pipeline

---

## Open Questions

1. **`rosterSpots` field structure in play-by-play**
   - What we know: The PBP response includes a `rosterSpots` array with player info including `playerId`, `firstName`, `lastName`. Structure confirmed by community analysis.
   - What's unclear: Exact nested structure of `firstName`/`lastName` — may be `{"default": "Connor"}` objects or plain strings. The code above uses the nested dict form (most commonly documented).
   - Recommendation: On Wave 0, fetch one real game and save the raw JSON as a test fixture. Verify the `rosterSpots` structure before assuming the dict form.

2. **`gameWeek` span when calling `/v1/schedule/{date}`**
   - What we know: The response contains a `gameWeek` array that may include multiple days.
   - What's unclear: Whether it returns exactly 1 day or a full week. If a full week, daily iteration is ~7x redundant (but correct with set deduplication).
   - Recommendation: On Wave 0, fetch a single schedule date, print `len(data['gameWeek'])`, and check the date spread. If it returns 7 days, consider advancing by 7 days per iteration to reduce API calls from ~196 to ~28.

3. **Rate limit threshold**
   - What we know: No official documentation. Community consensus is 1 req/sec is safe.
   - What's unclear: Whether the new API (`api-web.nhle.com`) has different limits than the old API.
   - Recommendation: Start with 1 req/sec as locked. Monitor for 429 responses during the first 50-game trial run. The tenacity retry handles any 429s that do occur.

---

## Sources

### Primary (HIGH confidence)
- [Neon Python connection guide](https://neon.com/docs/guides/python) — psycopg3 connection string format, SSL requirements
- [tenacity documentation](https://tenacity.readthedocs.io/en/stable/) — retry decorator patterns

### Secondary (MEDIUM confidence)
- [Zmalski/NHL-API-Reference](https://github.com/Zmalski/NHL-API-Reference) — endpoint catalog (unofficial; no response schemas)
- [NHL-API-Reference Issue #28 — PBP Code Book](https://github.com/Zmalski/NHL-API-Reference/issues/28) — event type codes and play field names
- [NHL API with Python — Medium](https://medium.com/@vtashlikovich/nhl-api-what-data-is-exposed-and-how-to-analyse-it-with-python-745fcd6838c2) — field names `typeDescKey`, `xCoord`, `yCoord`, `periodDescriptor`
- [2024-25 NHL Season — Wikipedia](https://en.wikipedia.org/wiki/2024%E2%80%9325_NHL_season) — season start/end dates, 1,312 total games
- [psycopg3 executemany discussion](https://github.com/psycopg/psycopg/discussions/517) — batch insert patterns

### Tertiary (LOW confidence)
- Community consensus on 1 req/sec rate limit — no official source; empirically observed across multiple open-source projects
- `rosterSpots` field structure — inferred from community analysis; not directly verified against a live API call in this research session

---

## Metadata

**Confidence breakdown:**
- NHL API endpoints (URLs): HIGH — multiple independent community sources agree on `api-web.nhle.com/v1/`
- Play-by-play field names (`typeDescKey`, `eventId`, `xCoord`, etc.): MEDIUM — consistent across community sources but not official docs
- `rosterSpots` sub-structure: LOW — structure inferred; validate with a real API call in Wave 0
- `goal` events using `scoringPlayerId`: MEDIUM — documented in PBP code book
- 2024-25 season dates: HIGH — Wikipedia + NHL.com press release
- psycopg3 patterns: HIGH — official psycopg3 docs
- tenacity patterns: HIGH — official tenacity docs

**Research date:** 2026-07-18
**Valid until:** 2026-09-01 (NHL API is undocumented and can change without notice; re-validate endpoints before any new season's ingest)
