"""Tests for create_schema and ingest_shots (PIPE-03): DDL, insert, idempotent upsert.

These tests require DATABASE_URL_UNPOOLED to be set. They operate on a separate
nhl_raw_test schema that is created and dropped around each test.
"""
import os
import pytest
import psycopg
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from dotenv import load_dotenv
from ingest import create_schema, ingest_shots  # will fail with ImportError until plan 02

load_dotenv()


def _psycopg_url(url: str) -> str:
    """Strip Prisma-only query params (e.g. schema=) that psycopg rejects."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    params.pop("schema", None)  # remove Prisma-specific schema param
    clean_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=clean_query))


@pytest.fixture
def test_conn():
    """Postgres connection using a test schema (nhl_raw_test) that is cleaned up after each test."""
    db_url = os.environ.get("DATABASE_URL_UNPOOLED")
    if not db_url:
        pytest.skip("DATABASE_URL_UNPOOLED not set — skipping DB tests")
    conn = psycopg.connect(_psycopg_url(db_url))
    # Override schema to nhl_raw_test to avoid touching nhl_raw
    with conn.cursor() as cur:
        cur.execute("CREATE SCHEMA IF NOT EXISTS nhl_raw_test")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS nhl_raw_test.shot_events (
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
            )
        """)
    conn.commit()
    yield conn
    with conn.cursor() as cur:
        cur.execute("DROP SCHEMA nhl_raw_test CASCADE")
    conn.commit()
    conn.close()


def test_create_schema_is_idempotent(test_conn):
    """create_schema can be called twice without raising an error."""
    create_schema(test_conn)
    create_schema(test_conn)  # second call must not raise


def test_ingest_shots_inserts_rows(test_conn, sample_shots):
    """ingest_shots inserts the expected number of rows into the test table."""
    # Patch INSERT_SQL to target nhl_raw_test
    import ingest
    original_sql = ingest.INSERT_SQL
    ingest.INSERT_SQL = original_sql.replace("nhl_raw.shot_events", "nhl_raw_test.shot_events")
    try:
        ingest_shots(test_conn, sample_shots)
    finally:
        ingest.INSERT_SQL = original_sql
    with test_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM nhl_raw_test.shot_events")
        count = cur.fetchone()[0]
    assert count == len(sample_shots)


def test_idempotent_upsert_no_duplicates(test_conn, sample_shots):
    """Running ingest_shots twice on the same data produces zero duplicate rows."""
    import ingest
    original_sql = ingest.INSERT_SQL
    ingest.INSERT_SQL = original_sql.replace("nhl_raw.shot_events", "nhl_raw_test.shot_events")
    try:
        ingest_shots(test_conn, sample_shots)
        count_after_first = None
        with test_conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM nhl_raw_test.shot_events")
            count_after_first = cur.fetchone()[0]
        ingest_shots(test_conn, sample_shots)  # second run — same data
        with test_conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM nhl_raw_test.shot_events")
            count_after_second = cur.fetchone()[0]
    finally:
        ingest.INSERT_SQL = original_sql
    assert count_after_first == count_after_second
