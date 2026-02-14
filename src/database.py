"""Cosmos DB conversation history for Social AI Studio.

Stores and retrieves conversation history using Azure Cosmos DB (NoSQL API).
Falls back to in-memory storage when Cosmos DB is not configured.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from src.config import COSMOS_CONTAINER, COSMOS_DATABASE, COSMOS_ENDPOINT

logger = logging.getLogger(__name__)

# Lazy-init Cosmos client
_STATE: dict[str, Any] = {
    "cosmos_client": None,
    "container": None,
    "initialized": False,
}


def _get_container():
    """Get or create Cosmos DB container client (lazy init)."""
    if _STATE["initialized"]:
        return _STATE["container"]

    _STATE["initialized"] = True

    if not COSMOS_ENDPOINT:
        logger.info("COSMOS_ENDPOINT not set — using in-memory history")
        return None

    try:
        from azure.cosmos import CosmosClient
        from azure.identity import DefaultAzureCredential

        credential = DefaultAzureCredential()
        _STATE["cosmos_client"] = CosmosClient(COSMOS_ENDPOINT, credential=credential)

        # Use existing database and container (provisioned via IaC / Azure CLI).
        # get_*_client() creates a local reference without a network call,
        # so it works with the Data Contributor data-plane role — unlike
        # create_*_if_not_exists() which requires control-plane write perms.
        database = _STATE["cosmos_client"].get_database_client(COSMOS_DATABASE)
        _STATE["container"] = database.get_container_client(COSMOS_CONTAINER)

        logger.info(
            "Cosmos DB connected: %s, db=%s, container=%s",
            COSMOS_ENDPOINT,
            COSMOS_DATABASE,
            COSMOS_CONTAINER,
        )
        return _STATE["container"]

    except ImportError as e:
        logger.warning("Cosmos SDK not available, falling back to in-memory: %s", e)
        return None
    except (ValueError, RuntimeError, OSError) as e:
        logger.warning("Cosmos DB init failed, falling back to in-memory: %s", e)
        return None


# In-memory fallback
_memory_store: dict[str, dict[str, Any]] = {}


def snapshot_database_state_for_tests() -> dict[str, Any]:
    """Return a snapshot of module state for tests."""
    return {
        "memory_store": _memory_store.copy(),
        "initialized": _STATE["initialized"],
        "container": _STATE["container"],
        "cosmos_client": _STATE["cosmos_client"],
    }


def force_in_memory_mode_for_tests() -> None:
    """Force in-memory mode for deterministic unit tests."""
    _STATE["initialized"] = True
    _STATE["container"] = None
    _STATE["cosmos_client"] = None
    _memory_store.clear()


def restore_database_state_for_tests(snapshot: dict[str, Any]) -> None:
    """Restore module state from a snapshot created by tests."""
    _memory_store.clear()
    _memory_store.update(snapshot.get("memory_store", {}))
    _STATE["initialized"] = snapshot.get("initialized", False)
    _STATE["container"] = snapshot.get("container")
    _STATE["cosmos_client"] = snapshot.get("cosmos_client")


def save_conversation(
    conversation_id: str,
    title: str,
    messages: list[dict],
    user_id: str = "anonymous",
) -> None:
    """Save or update a conversation."""
    container = _get_container()
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": conversation_id,
        "userId": user_id,
        "title": title,
        "messages": messages,
        "updatedAt": now,
        "createdAt": now,  # Cosmos upsert preserves existing createdAt via partial update
    }

    if container is not None:
        try:
            from azure.cosmos.exceptions import CosmosHttpResponseError, CosmosResourceNotFoundError

            # Try to preserve existing createdAt
            try:
                existing = container.read_item(item=conversation_id, partition_key=user_id)
                doc["createdAt"] = existing.get("createdAt", now)
            except CosmosResourceNotFoundError:
                pass  # New document — use current time

            container.upsert_item(doc)
            logger.debug("Saved conversation %s to Cosmos DB", conversation_id)
        except CosmosHttpResponseError as e:
            logger.error("Failed to save to Cosmos DB: %s", e)
            # Fallback to memory
            _memory_store[conversation_id] = doc
    else:
        if conversation_id not in _memory_store:
            doc["createdAt"] = now
        else:
            doc["createdAt"] = _memory_store[conversation_id].get("createdAt", now)
        _memory_store[conversation_id] = doc


def list_conversations(user_id: str = "anonymous") -> list[dict]:
    """List all conversations for a user, ordered by most recent first."""
    container = _get_container()

    if container is not None:
        try:
            from azure.cosmos.exceptions import CosmosHttpResponseError

            query = (
                "SELECT c.id, c.title, c.createdAt, c.updatedAt "
                "FROM c WHERE c.userId = @userId "
                "ORDER BY c.updatedAt DESC"
            )
            items = list(
                container.query_items(
                    query=query,
                    parameters=[{"name": "@userId", "value": user_id}],
                    enable_cross_partition_query=False,
                )
            )
            return items
        except CosmosHttpResponseError as e:
            logger.error("Failed to list conversations from Cosmos DB: %s", e)
            return []
    else:
        # In-memory fallback
        convos = [
            {
                "id": v["id"],
                "title": v["title"],
                "createdAt": v.get("createdAt", ""),
                "updatedAt": v.get("updatedAt", ""),
            }
            for v in _memory_store.values()
            if v.get("userId", "anonymous") == user_id
        ]
        convos.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
        return convos


def get_conversation(conversation_id: str, user_id: str = "anonymous") -> dict | None:
    """Get a single conversation with messages."""
    container = _get_container()

    if container is not None:
        try:
            from azure.cosmos.exceptions import CosmosResourceNotFoundError

            item = container.read_item(item=conversation_id, partition_key=user_id)
            return item
        except CosmosResourceNotFoundError:
            return None
    else:
        return _memory_store.get(conversation_id)


def delete_conversation(conversation_id: str, user_id: str = "anonymous") -> bool:
    """Delete a conversation."""
    container = _get_container()

    if container is not None:
        try:
            from azure.cosmos.exceptions import CosmosHttpResponseError

            container.delete_item(item=conversation_id, partition_key=user_id)
            return True
        except CosmosHttpResponseError as e:
            logger.error("Failed to delete conversation: %s", e)
            return False
    else:
        if conversation_id in _memory_store:
            del _memory_store[conversation_id]
            return True
        return False
