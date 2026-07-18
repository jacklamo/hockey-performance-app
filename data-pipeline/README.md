# NHL Data Pipeline

Ingests a full NHL regular season of shot events into `nhl_raw.shot_events` in Postgres.

## Setup

```bash
cd data-pipeline
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set DATABASE_URL_UNPOOLED to your Neon direct connection string
```

## Run

```bash
python ingest.py --season 20242025
```

Season format: `YYYYYYYY` (e.g., `20242025` for the 2024-25 season). Regular season only.

## Tests

```bash
python -m pytest tests/ -v
```

## Output

The pipeline prints progress every 50 games and a final summary:

```
[50/1312] 4% — 3,241 shots ingested so far
[100/1312] 8% — 6,489 shots ingested so far
...
=== NHL Data Pipeline Complete ===
Season:              20242025
Games processed:     1312
Shot events inserted: 89,421
Failed games:        0
Final row count:     89,421 (from nhl_raw.shot_events)
```
