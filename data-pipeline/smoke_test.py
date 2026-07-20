import ingest, os, psycopg, time
from dotenv import load_dotenv
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

load_dotenv()

def _psycopg_url(url):
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    params.pop("schema", None)
    return urlunparse(parsed._replace(query=urlencode({k: v[0] for k, v in params.items()})))

conn = psycopg.connect(_psycopg_url(os.environ["DATABASE_URL_UNPOOLED"]))
ingest.create_schema(conn)
ingest.SEASON_DATES["smoke"] = ("2024-10-04", "2024-10-04")
game_ids = ingest.fetch_game_ids("smoke")
print("Games:", game_ids)
total = 0
for gid in game_ids:
    shots = ingest.fetch_shots(gid)
    if shots:
        ingest.ingest_shots(conn, shots)
        total += len(shots)
    time.sleep(1)
with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM nhl_raw.shot_events")
    print("Rows:", cur.fetchone()[0])
conn.close()
print(f"{len(game_ids)} games, {total} shots ingested")
