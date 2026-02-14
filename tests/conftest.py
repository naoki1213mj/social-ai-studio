"""Shared test fixtures for Social AI Studio tests."""

import pytest


@pytest.fixture(autouse=True)
def _reset_database_state():
    """Reset in-memory database state between tests."""
    import src.database as db

    snapshot = db.snapshot_database_state_for_tests()
    db.force_in_memory_mode_for_tests()

    yield

    # Restore original state
    db.restore_database_state_for_tests(snapshot)


@pytest.fixture
def mock_env(monkeypatch):
    """Helper to set environment variables for config tests."""

    def _set(**kwargs):
        for key, value in kwargs.items():
            monkeypatch.setenv(key, value)

    return _set


@pytest.fixture
def sample_chat_body() -> dict:
    """Return a valid chat request body for API tests."""
    return {
        "message": "Launch our new AI product",
        "platforms": ["linkedin", "x"],
        "content_type": "product_launch",
        "language": "en",
        "reasoning_effort": "medium",
        "reasoning_summary": "auto",
    }
