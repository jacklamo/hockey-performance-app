"""Tests for _get retry behavior (PIPE-04): 429/503 triggers retry, exhaustion skips game."""
import pytest
import httpx
from unittest.mock import patch, MagicMock
from ingest import _get  # will fail with ImportError until plan 02


def test_retries_on_429(mocker):
    """_get retries when the NHL API returns a 429 response."""
    mock_response_429 = MagicMock(spec=httpx.Response)
    mock_response_429.status_code = 429
    mock_response_429.raise_for_status.side_effect = httpx.HTTPStatusError(
        "429", request=MagicMock(), response=mock_response_429
    )
    mock_response_ok = MagicMock(spec=httpx.Response)
    mock_response_ok.status_code = 200
    mock_response_ok.raise_for_status.return_value = None
    mock_response_ok.json.return_value = {"plays": []}

    call_count = {"n": 0}

    def side_effect(url, timeout):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return mock_response_429
        return mock_response_ok

    mocker.patch("httpx.get", side_effect=side_effect)
    result = _get("https://api-web.nhle.com/v1/schedule/2024-10-04")
    assert result == {"plays": []}
    assert call_count["n"] == 2  # failed once, succeeded on retry


def test_raises_after_max_attempts(mocker):
    """After 3 failed attempts, _get re-raises so the caller can catch and skip the game."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 503
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "503", request=MagicMock(), response=mock_response
    )
    mocker.patch("httpx.get", return_value=mock_response)
    with pytest.raises(httpx.HTTPStatusError):
        _get("https://api-web.nhle.com/v1/gamecenter/2024020001/play-by-play")
