"""Tests for fetch_game_ids (PIPE-01): schedule walk, gameType filter, deduplication."""
import pytest
from unittest.mock import patch
from ingest import fetch_game_ids  # will fail with ImportError until plan 02


def test_collects_regular_season_game_ids(sample_schedule_response):
    """fetch_game_ids returns game IDs where gameType==2."""
    with patch("ingest._get", return_value=sample_schedule_response):
        # Patch date range to a single day so only one _get call is made
        with patch("ingest.SEASON_DATES", {"20242025": ("2024-10-04", "2024-10-04")}):
            game_ids = fetch_game_ids("20242025")
    assert 2024020001 in game_ids


def test_filters_non_regular_season(sample_schedule_response):
    """fetch_game_ids excludes games where gameType != 2."""
    with patch("ingest._get", return_value=sample_schedule_response):
        with patch("ingest.SEASON_DATES", {"20242025": ("2024-10-04", "2024-10-04")}):
            game_ids = fetch_game_ids("20242025")
    assert 2024010001 not in game_ids  # preseason game must be excluded


def test_deduplicates_game_ids():
    """fetch_game_ids deduplicates game IDs that appear in multiple gameWeek entries."""
    duplicate_response = {
        "gameWeek": [
            {"date": "2024-10-04", "games": [{"id": 2024020001, "gameType": 2}]},
            {"date": "2024-10-05", "games": [{"id": 2024020001, "gameType": 2}]},
        ]
    }
    with patch("ingest._get", return_value=duplicate_response):
        with patch("ingest.SEASON_DATES", {"20242025": ("2024-10-04", "2024-10-04")}):
            game_ids = fetch_game_ids("20242025")
    assert game_ids.count(2024020001) == 1
