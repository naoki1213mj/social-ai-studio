"""AzureOpenAIResponsesClient singleton.

Reuses a single client instance across the application to avoid
repeated credential acquisition and connection overhead.

Includes a monkey-patch to add ``type: "message"`` to Responses API
input items, which the current agent-framework-core SDK omits.

Uses ``AsyncOpenAI`` (not ``AsyncAzureOpenAI``) as the underlying HTTP
client because the Foundry ``/openai/v1/`` path rejects the
``api-version`` query parameter that ``AsyncAzureOpenAI`` always adds.
"""

# pylint: disable=no-name-in-module

import logging
from functools import lru_cache
from typing import Any

from agent_framework import Message
from agent_framework.azure import AzureOpenAIResponsesClient  # type: ignore[attr-defined]
from agent_framework.openai._responses_client import RawOpenAIResponsesClient
from azure.identity import DefaultAzureCredential
from openai import AsyncOpenAI

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
_original_prepare_message = getattr(RawOpenAIResponsesClient, "_prepare_message_for_openai")


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


setattr(RawOpenAIResponsesClient, "_prepare_message_for_openai", _patched_prepare_message)


async def _get_token() -> str:
    """Async token provider for Azure AD authentication.

    Returns a fresh token each time, letting DefaultAzureCredential
    handle caching and refresh internally.
    """
    token = _credential.get_token(AZURE_AI_SCOPE)
    return token.token


def _get_token_sync() -> str:
    """Synchronous token provider used during client initialisation."""
    return _credential.get_token(AZURE_AI_SCOPE).token


@lru_cache(maxsize=1)
def get_client() -> AzureOpenAIResponsesClient:
    """Return a singleton AzureOpenAIResponsesClient.

    Uses DefaultAzureCredential (Azure CLI login) for authentication.
    The client is created once and reused for all subsequent calls.

    The underlying HTTP client is ``AsyncOpenAI`` (not
    ``AsyncAzureOpenAI``) to avoid sending the ``api-version`` query
    parameter, which the Foundry ``/openai/v1/`` endpoint now rejects.
    """
    if not RESPONSES_API_BASE_URL:
        raise ValueError("PROJECT_ENDPOINT is not configured. Set it in .env or environment variables.")

    logger.info(
        "Creating AzureOpenAIResponsesClient: base_url=%s, deployment=%s",
        RESPONSES_API_BASE_URL,
        MODEL_DEPLOYMENT_NAME,
    )

    # Create AsyncOpenAI (not AsyncAzureOpenAI) to avoid api_version
    # query parameter.  The Foundry /openai/v1/ path does not accept it.
    raw_client = AsyncOpenAI(
        base_url=RESPONSES_API_BASE_URL,
        api_key=_get_token_sync(),
    )

    return AzureOpenAIResponsesClient(
        async_client=raw_client,
        deployment_name=MODEL_DEPLOYMENT_NAME,
        ad_token_provider=_get_token,
    )
