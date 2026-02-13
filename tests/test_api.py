"""Tests for src/api.py — FastAPI endpoints."""

import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from src.api import REASONING_PATTERN, TOOL_EVENT_PATTERN, _extract_image_prompts, app


@pytest.fixture
def client():
    """Create a FastAPI test client (no lifespan to avoid Azure calls)."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestHealthEndpoint:
    """Test GET /api/health."""

    def test_health_returns_200(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_response_body(self, client):
        data = client.get("/api/health").json()
        assert data["status"] == "ok"
        assert data["service"] == "social-ai-studio"
        assert "version" in data


class TestConversationEndpoints:
    """Test conversation CRUD endpoints."""

    def test_list_empty(self, client):
        response = client.get("/api/conversations")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_and_list(self, client):
        # Save via internal function (API doesn't have a create endpoint directly)
        from src.database import save_conversation

        save_conversation("c1", "Test Chat", [{"role": "user", "content": "hi"}])

        response = client.get("/api/conversations")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "c1"

    def test_get_conversation(self, client):
        from src.database import save_conversation

        save_conversation("c1", "Test", [{"role": "user", "content": "hello"}])
        response = client.get("/api/conversations/c1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "c1"
        assert len(data["messages"]) == 1

    def test_get_nonexistent(self, client):
        response = client.get("/api/conversations/does-not-exist")
        assert response.status_code == 404

    def test_delete_conversation(self, client):
        from src.database import save_conversation

        save_conversation("c1", "To Delete", [])
        response = client.delete("/api/conversations/c1")
        assert response.status_code == 200
        assert response.json()["status"] == "deleted"

        # Confirm deleted
        response = client.get("/api/conversations/c1")
        assert response.status_code == 404

    def test_delete_nonexistent(self, client):
        response = client.delete("/api/conversations/nope")
        assert response.status_code == 404


class TestChatEndpoint:
    """Test POST /api/chat."""

    def test_invalid_body_returns_400(self, client):
        response = client.post(
            "/api/chat",
            content=b"not json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 400

    def test_missing_message_returns_400(self, client):
        response = client.post("/api/chat", json={"platforms": ["x"]})
        assert response.status_code == 400

    @patch("src.api.run_agent_stream")
    def test_chat_returns_sse(self, mock_stream, client, sample_chat_body):
        async def fake_stream(*args, **kwargs):
            yield "Hello from agent"

        mock_stream.return_value = fake_stream()
        response = client.post("/api/chat", json=sample_chat_body)
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")

    @patch("src.api.run_agent_stream")
    def test_chat_done_signal(self, mock_stream, client, sample_chat_body):
        async def fake_stream(*args, **kwargs):
            yield "content text"

        mock_stream.return_value = fake_stream()
        response = client.post("/api/chat", json=sample_chat_body)
        body = response.text

        # Should contain a done event
        assert '"type": "done"' in body or '"type":"done"' in body


class TestRegexPatterns:
    """Test the regex patterns used for SSE parsing."""

    def test_tool_event_pattern(self):
        text = '__TOOL_EVENT__{"tool":"web_search","status":"started"}__END_TOOL_EVENT__'
        match = TOOL_EVENT_PATTERN.search(text)
        assert match is not None
        payload = json.loads(match.group(1))
        assert payload["tool"] == "web_search"

    def test_tool_event_pattern_no_match(self):
        text = "plain text without markers"
        assert TOOL_EVENT_PATTERN.search(text) is None

    def test_reasoning_pattern(self):
        text = "__REASONING_REPLACE__This is my thinking__END_REASONING_REPLACE__"
        match = REASONING_PATTERN.search(text)
        assert match is not None
        assert match.group(1) == "This is my thinking"

    def test_reasoning_pattern_multiline(self):
        text = "__REASONING_REPLACE__Step 1\nStep 2\nStep 3__END_REASONING_REPLACE__"
        match = REASONING_PATTERN.search(text)
        assert match is not None
        assert "Step 1" in match.group(1)
        assert "Step 3" in match.group(1)


class TestImageFallback:
    """Test image fallback behavior in API layer."""

    def test_extract_image_prompts_normal(self):
        content = """```json
{
    "contents": [
        {"platform": "linkedin", "image_prompt": "professional office scene"},
        {"platform": "instagram", "image_prompt": "vibrant geometric design"}
    ]
}
```"""
        prompts = _extract_image_prompts(content)
        assert prompts["linkedin"] == "professional office scene"
        assert prompts["instagram"] == "vibrant geometric design"

    def test_extract_image_prompts_ab(self):
        content = """```json
{
    "mode": "ab",
    "variant_a": {
        "contents": [
            {"platform": "linkedin", "image_prompt": "A prompt"}
        ]
    },
    "variant_b": {
        "contents": [
            {"platform": "instagram", "image_prompt": "B prompt"}
        ]
    }
}
```"""
        prompts = _extract_image_prompts(content)
        assert prompts["linkedin"] == "A prompt"
        assert prompts["instagram"] == "B prompt"

    @patch("src.api.pop_pending_images")
    @patch("src.api.generate_image")
    @patch("src.api.run_agent_stream")
    def test_chat_emits_fallback_image_event(self, mock_stream, mock_generate_image, mock_pop_pending_images, client):
        async def fake_stream(*args, **kwargs):
            yield """```json
{
    \"contents\": [
        {
            \"platform\": \"linkedin\",
            \"body\": \"test\",
            \"hashtags\": [],
            \"call_to_action\": \"\",
            \"posting_time\": \"\",
            \"image_prompt\": \"professional office scene\"
        }
    ],
    \"review\": {
        \"overall_score\": 8,
        \"scores\": {
            \"brand_alignment\": 8,
            \"audience_relevance\": 8,
            \"engagement_potential\": 8,
            \"clarity\": 8,
            \"platform_optimization\": 8
        },
        \"feedback\": [],
        \"improvements_made\": []
    },
    \"sources_used\": []
}
```"""

        async def fake_generate_image(*args, **kwargs):
            return '{"status":"generated"}'

        mock_stream.return_value = fake_stream()
        mock_generate_image.side_effect = fake_generate_image
        mock_pop_pending_images.return_value = {"linkedin": "abc123"}

        body = {
            "message": "test",
            "platforms": ["linkedin"],
            "content_type": "tech_insight",
            "language": "ja",
            "reasoning_effort": "low",
            "reasoning_summary": "auto",
            "ab_mode": False,
        }
        response = client.post("/api/chat", json=body)
        assert response.status_code == 200
        assert '"type": "image"' in response.text or '"type":"image"' in response.text
        assert '"platform": "linkedin"' in response.text or '"platform":"linkedin"' in response.text
