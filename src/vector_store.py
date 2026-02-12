"""Vector Store setup for File Search grounding.

Creates a Vector Store with the brand guidelines file and caches the ID
in .env for subsequent runs. Uses the openai SDK's VectorStores API.
"""

import logging
import os
from pathlib import Path

from azure.identity import DefaultAzureCredential
from dotenv import set_key
from openai import AzureOpenAI

from src.config import PROJECT_ENDPOINT, VECTOR_STORE_ID

logger = logging.getLogger(__name__)

# Brand guidelines file path
BRAND_GUIDELINES_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "brand_guidelines.md"
)

# Azure token scope (must match client.py)
_AZURE_AI_SCOPE = "https://ai.azure.com/.default"


def _get_openai_client() -> AzureOpenAI:
    """Create an AzureOpenAI client for Vector Store operations."""
    credential = DefaultAzureCredential()
    token = credential.get_token(_AZURE_AI_SCOPE)

    return AzureOpenAI(
        azure_endpoint=PROJECT_ENDPOINT,
        api_key=token.token,
        api_version="2025-05-15-preview",
    )


def ensure_vector_store() -> str:
    """Ensure a Vector Store exists with brand guidelines uploaded.

    Returns the vector_store_id. If VECTOR_STORE_ID is already set in
    the environment, reuses it. Otherwise creates a new one and caches
    the ID in .env.

    Returns:
        The vector store ID string.
    """
    if VECTOR_STORE_ID:
        logger.info("Using cached VECTOR_STORE_ID: %s", VECTOR_STORE_ID)
        return VECTOR_STORE_ID

    logger.info("No VECTOR_STORE_ID found — creating new vector store...")
    client = _get_openai_client()

    # Check if brand guidelines file exists
    if not BRAND_GUIDELINES_PATH.exists():
        logger.error("Brand guidelines file not found: %s", BRAND_GUIDELINES_PATH)
        raise FileNotFoundError(f"Brand guidelines not found: {BRAND_GUIDELINES_PATH}")

    # Create vector store
    vector_store = client.vector_stores.create(
        name="techpulse_brand_guidelines",
    )
    vs_id = vector_store.id
    logger.info("Created vector store: %s", vs_id)

    # Upload brand guidelines file
    with open(BRAND_GUIDELINES_PATH, "rb") as f:
        uploaded_file = client.files.create(
            file=f,
            purpose="assistants",
        )
    logger.info("Uploaded file: %s (%s)", uploaded_file.id, BRAND_GUIDELINES_PATH.name)

    # Attach file to vector store
    client.vector_stores.files.create(
        vector_store_id=vs_id,
        file_id=uploaded_file.id,
    )
    logger.info("Attached file %s to vector store %s", uploaded_file.id, vs_id)

    # Cache in .env for future runs
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        set_key(str(env_path), "VECTOR_STORE_ID", vs_id)
        logger.info("Cached VECTOR_STORE_ID=%s in .env", vs_id)

    # Also update the runtime config
    os.environ["VECTOR_STORE_ID"] = vs_id

    return vs_id


if __name__ == "__main__":
    # CLI entry point: create vector store manually.
    logging.basicConfig(level=logging.INFO)
    result_id = ensure_vector_store()
    print(f"Vector Store ID: {result_id}")
