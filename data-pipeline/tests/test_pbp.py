"""Tests for fetch_shots (PIPE-02): shot extraction, player ID fallback, null safety."""
import pytest
from unittest.mock import patch
from ingest import fetch_shots  # will fail with ImportError until plan 02


def test_shot_extraction_filters_non_shot_events(sample_pbp_response):
    """fetch_shots returns only shot event types; faceoff events are excluded."""
    with patch("ingest._get", return_value=sample_pbp_response):
        shots = fetch_shots(2024020001)
    event_types = {s["event_type"] for s in shots}
    assert "faceoff" not in event_types
    assert event_types.issubset({"shot-on-goal", "goal", "missed-shot", "blocked-shot"})


def test_shot_extraction_count(sample_pbp_response):
    """fetch_shots returns the correct number of shot events (3: sog + goal + blocked)."""
    with patch("ingest._get", return_value=sample_pbp_response):
        shots = fetch_shots(2024020001)
    assert len(shots) == 3


def test_goal_uses_scoring_player_id_fallback(sample_pbp_response):
    """For goal events, shooter_id falls back to scoringPlayerId when shootingPlayerId absent."""
    with patch("ingest._get", return_value=sample_pbp_response):
        shots = fetch_shots(2024020001)
    goal = next(s for s in shots if s["event_type"] == "goal")
    assert goal["shooter_id"] == 8478402  # scoringPlayerId from fixture


def test_null_details_does_not_raise(sample_pbp_response):
    """fetch_shots does not raise when a play's details field is None."""
    with patch("ingest._get", return_value=sample_pbp_response):
        shots = fetch_shots(2024020001)  # blocked-shot has details=None in fixture
    # If we reach here without exception, the guard works
    blocked = next((s for s in shots if s["event_type"] == "blocked-shot"), None)
    # blocked-shot with None details should produce a row (with None coords)
    assert blocked is not None
    assert blocked["x_coord"] is None
    assert blocked["y_coord"] is None
