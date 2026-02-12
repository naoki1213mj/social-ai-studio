"""AzureOpenAIResponsesClient singleton.

Reuses a single client instance across the application to avoid
repeated credential acquisition and connection overhead.

Includes a monkey-patch to add ``type: "message"`` to Responses API
input items, which the current agent-framework-core SDK omits.
"""

import logging
from functools import lru_cache
from typing import Any

from agent_framework import Message
from agent_framework.azure import AzureOpenAIResponsesClient
from agent_framework.openai._responses_client import RawOpenAIResponsesClient
from azure.identity import DefaultAzureCredential

from src.config import AZURE_AI_SCOPE, MODEL_DEPLOYMENT_NAME, RESPONSES_API_BASE_URL

logger = logging.getLogger(__name__)

# Shared credential (singleton)
_credential = DefaultAzureCredential()

# ---------------------------------------------------------------------------
# Monkey-patch: add type="message" to each message item for Responses API
# The Microsoft Foundry Responses API requires each input item to have
# an explicit "type" field (e.g., "message"), but the current
# agent-framework-core SDK does not include it.
# ---------------------------------------------------------------------------
_original_prepare_message = RawOpenAIResponsesClient._prepare_message_for_openai


def _patched_prepare_message(
    self: RawOpenAIResponsesClient,
    message: Message,
    call_id_to_id: dict[str, str],
) -> list[dict[str, Any]]:
    """Wrap the original method to add ``type`` to message items."""
    items = _original_prepare_message(self, message, call_id_to_id)
    for item in items:
        if "type" not in item and "role" in item:
            item["type"] = "message"
    return items


RawOpenAIResponsesClient._prepare_message_for_openai = _patched_prepare_message  # type: ignore[assignment]


async def _get_token() -> str:
    """Async token provider for Azure AD authentication.

    Returns a fresh token each time, letting DefaultAzureCredential
    handle caching and refresh internally.
    """
    token = _credential.get_token(AZURE_AI_SCOPE)
    return token.token


@lru_cache(maxsize=1)
def get_client() -> AzureOpenAIResponsesClient:
    """Return a singleton AzureOpenAIResponsesClient.

    Uses DefaultAzureCredential (Azure CLI login) for authentication.
    The client is created once and reused for all subsequent calls.
    """
    if not RESPONSES_API_BASE_URL:
        raise ValueError("PROJECT_ENDPOINT is not configured. Set it in .env or environment variables.")

    logger.info(
        f"Creating AzureOpenAIResponsesClient: base_url={RESPONSES_API_BASE_URL}, deployment={MODEL_DEPLOYMENT_NAME}"
    )

    return AzureOpenAIResponsesClient(
        base_url=RESPONSES_API_BASE_URL,
        deployment_name=MODEL_DEPLOYMENT_NAME,
        ad_token_provider=_get_token,
        api_version="2025-05-15-preview",
    )
