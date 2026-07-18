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

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NHL_BASE = "https://api-web.nhle.com/v1"

SHOT_TYPES = {"shot-on-goal", "goal", "missed-shot", "blocked-shot"}

SEASON_DATES = {
    "20242025": ("2024-10-04", "2025-04-17"),
}

# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def _is_retryable(exc: BaseException) -> bool:
    """Return True for transient HTTP errors worth retrying."""
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    if isinstance(exc, (httpx.ConnectError, httpx.TimeoutException)):
        return True
    return False


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    retry=retry_if_exception(_is_retryable),
    reraise=True,
)
def _get(url: str) -> dict:
    """HTTP GET with automatic retry on transient errors."""
    resp = httpx.get(url, timeout=15)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Schedule walker
# ---------------------------------------------------------------------------


def fetch_game_ids(season: str) -> list:
    """Return sorted list of regular-season game IDs for the given season.

    Args:
        season: Season string, e.g. "20242025".

    Returns:
        Sorted list of integer game IDs (gameType==2 only).
    """
    start_str, end_str = SEASON_DATES[season]
    start = date.fromisoformat(start_str)
    end = date.fromisoformat(end_str)

    game_ids: set = set()
    current = start
    while current <= end:
        data = _get(f"{NHL_BASE}/schedule/{current.isoformat()}")
        for week in data.get("gameWeek", []):
            for game in week.get("games", []):
                if game.get("gameType") == 2:
                    game_ids.add(int(game["id"]))
        time.sleep(1)
        current += timedelta(days=1)

    return sorted(game_ids)


# ---------------------------------------------------------------------------
# Play-by-play shot extractor
# ---------------------------------------------------------------------------


def fetch_shots(game_id: int) -> list:
    """Fetch and extract shot events from the NHL play-by-play endpoint.

    Args:
        game_id: NHL game ID integer.

    Returns:
        List of dicts with all 10 schema column keys.
    """
    data = _get(f"{NHL_BASE}/gamecenter/{game_id}/play-by-play")

    # Build player name lookup from roster spots
    player_names: dict = {}
    for spot in data.get("rosterSpots", []):
        pid = spot.get("playerId")
        first = spot.get("firstName", {}).get("default", "")
        last = spot.get("lastName", {}).get("default", "")
        if pid is not None:
            player_names[pid] = f"{first} {last}".strip()

    shots = []
    for play in data.get("plays", []):
        if play.get("typeDescKey") not in SHOT_TYPES:
            continue

        details = play.get("details") or {}   # CRITICAL: handles None
        pd = play.get("periodDescriptor") or {}

        sid = details.get("shootingPlayerId") or details.get("scoringPlayerId")

        shots.append({
            "game_id": game_id,
            "event_id": play.get("eventId"),
            "period": pd.get("number"),
            "period_time": play.get("timeInPeriod"),
            "event_type": play.get("typeDescKey"),
            "shot_type": details.get("shotType"),
            "x_coord": details.get("xCoord"),
            "y_coord": details.get("yCoord"),
            "shooter_id": sid,
            "shooter_name": player_names.get(sid) if sid is not None else None,
        })

    return shots


# ---------------------------------------------------------------------------
# Database DDL and ingest
# ---------------------------------------------------------------------------

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

INSERT_SQL = """
INSERT INTO nhl_raw.shot_events
    (game_id, event_id, period, period_time, event_type,
     shot_type, x_coord, y_coord, shooter_id, shooter_name)
VALUES
    (%(game_id)s, %(event_id)s, %(period)s, %(period_time)s, %(event_type)s,
     %(shot_type)s, %(x_coord)s, %(y_coord)s, %(shooter_id)s, %(shooter_name)s)
ON CONFLICT (game_id, event_id) DO NOTHING
"""


def create_schema(conn: psycopg.Connection) -> None:
    """Create nhl_raw schema and shot_events table if they do not exist.

    Safe to call multiple times (idempotent).
    """
    with conn.cursor() as cur:
        cur.execute(CREATE_DDL)
    conn.commit()


def ingest_shots(conn: psycopg.Connection, shots: list) -> int:
    """Insert shot dicts into nhl_raw.shot_events using ON CONFLICT DO NOTHING.

    Args:
        conn: Active psycopg connection.
        shots: List of dicts with all 10 schema column keys.

    Returns:
        Number of shots submitted (not necessarily inserted — duplicates skipped).
    """
    if not shots:
        return 0
    with conn.cursor() as cur:
        cur.executemany(INSERT_SQL, shots)
    conn.commit()
    return len(shots)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest NHL shot events into nhl_raw.shot_events."
    )
    parser.add_argument(
        "--season",
        required=True,
        help="Season in YYYYYYYY format (e.g. 20242025 for 2024-25)",
    )
    args = parser.parse_args()
    season = args.season

    if season not in SEASON_DATES:
        parser.error(
            f"Unknown season '{season}'. Supported seasons: {list(SEASON_DATES.keys())}"
        )

    conn_str = os.environ.get("DATABASE_URL_UNPOOLED")
    if not conn_str:
        raise SystemExit("ERROR: DATABASE_URL_UNPOOLED env var is not set. Copy .env.example to .env and fill it in.")

    conn = psycopg.connect(conn_str)
    print(f"Connected to database.")
    create_schema(conn)
    print(f"Schema ready (nhl_raw.shot_events).")

    print(f"Fetching game IDs for season {season}...")
    game_ids = fetch_game_ids(season)
    total = len(game_ids)
    print(f"Found {total} regular-season games.")

    total_shots = 0
    failed: list = []

    for i, gid in enumerate(game_ids, 1):
        try:
            shots = fetch_shots(gid)
            if shots:
                ingest_shots(conn, shots)
                total_shots += len(shots)
        except Exception as exc:
            failed.append(gid)
            print(f"[SKIP] game {gid}: {exc}")
        if i % 50 == 0:
            pct = i * 100 // total
            print(f"[{i}/{total}] {pct}% — {total_shots:,} shots ingested so far")
        time.sleep(1)

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM nhl_raw.shot_events")
        final_count = cur.fetchone()[0]
    conn.close()

    print()
    print("=== NHL Data Pipeline Complete ===")
    print(f"Season:               {season}")
    print(f"Games processed:      {total - len(failed)}")
    print(f"Shot events inserted: {total_shots:,}")
    if failed:
        ids_str = ", ".join(str(g) for g in failed)
        print(f"Failed games:         {len(failed)} (game IDs: {ids_str})")
    else:
        print(f"Failed games:         0")
    print(f"Final row count:      {final_count:,} (from nhl_raw.shot_events)")


if __name__ == "__main__":
    main()
