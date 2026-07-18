"""Shared pytest fixtures for data-pipeline tests."""
import pytest


@pytest.fixture
def sample_schedule_response():
    """Mock response for GET /v1/schedule/2024-10-04.
    Contains one regular-season game (gameType=2) and one preseason game (gameType=1).
    """
    return {
        "gameWeek": [
            {
                "date": "2024-10-04",
                "games": [
                    {"id": 2024020001, "gameType": 2, "gameDate": "2024-10-04"},
                    {"id": 2024010001, "gameType": 1, "gameDate": "2024-10-04"},
                ],
            }
        ]
    }


@pytest.fixture
def sample_pbp_response():
    """Mock play-by-play response for game 2024020001.
    Contains:
    - shot-on-goal (shootingPlayerId present)
    - goal (scoringPlayerId present, no shootingPlayerId — tests fallback)
    - blocked-shot with details=None (tests null-safety)
    - faceoff (should be filtered out by fetch_shots)
    """
    return {
        "id": 2024020001,
        "rosterSpots": [
            {
                "playerId": 8478402,
                "firstName": {"default": "Connor"},
                "lastName": {"default": "McDavid"},
            },
        ],
        "plays": [
            {
                "eventId": 47,
                "typeDescKey": "shot-on-goal",
                "timeInPeriod": "14:32",
                "periodDescriptor": {"number": 1},
                "details": {
                    "xCoord": 45,
                    "yCoord": -12,
                    "shotType": "wrist",
                    "shootingPlayerId": 8478402,
                },
            },
            {
                "eventId": 55,
                "typeDescKey": "goal",
                "timeInPeriod": "15:00",
                "periodDescriptor": {"number": 1},
                "details": {
                    "xCoord": 50,
                    "yCoord": 0,
                    "shotType": "wrist",
                    "scoringPlayerId": 8478402,
                    # No shootingPlayerId — tests the OR fallback
                },
            },
            {
                "eventId": 60,
                "typeDescKey": "blocked-shot",
                "timeInPeriod": "16:00",
                "periodDescriptor": {"number": 2},
                "details": None,  # tests null-safety guard
            },
            {
                "eventId": 70,
                "typeDescKey": "faceoff",
                "timeInPeriod": "00:00",
                "periodDescriptor": {"number": 1},
                "details": {},
            },
        ],
    }


@pytest.fixture
def sample_shots():
    """Minimal list of shot dicts matching nhl_raw.shot_events columns."""
    return [
        {
            "game_id": 2024020001,
            "event_id": 47,
            "period": 1,
            "period_time": "14:32",
            "event_type": "shot-on-goal",
            "shot_type": "wrist",
            "x_coord": 45,
            "y_coord": -12,
            "shooter_id": 8478402,
            "shooter_name": "Connor McDavid",
        },
        {
            "game_id": 2024020001,
            "event_id": 55,
            "period": 1,
            "period_time": "15:00",
            "event_type": "goal",
            "shot_type": "wrist",
            "x_coord": 50,
            "y_coord": 0,
            "shooter_id": 8478402,
            "shooter_name": "Connor McDavid",
        },
    ]
