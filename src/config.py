"""Configuration loader for Social AI Studio.

Loads environment variables from .env, then overlays secrets from Azure Key Vault
when AZURE_KEY_VAULT_URL is set (production). Falls back to env vars for local dev.
"""

import logging
import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load .env from project root
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)


# ---------- Key Vault integration ---------- #
def _load_keyvault_secrets() -> dict[str, str]:
    """Load secrets from Azure Key Vault. Returns empty dict on failure."""
    vault_url = os.getenv("AZURE_KEY_VAULT_URL", "")
    if not vault_url:
        return {}
    try:
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.secrets import SecretClient

        client = SecretClient(vault_url=vault_url, credential=DefaultAzureCredential())
        # Map Key Vault secret names → env var names
        secret_map = {
            "project-endpoint": "PROJECT_ENDPOINT",
            "appinsights-connection-string": "APPLICATIONINSIGHTS_CONNECTION_STRING",
            "content-safety-endpoint": "CONTENT_SAFETY_ENDPOINT",
        }
        secrets: dict[str, str] = {}
        for kv_name, env_name in secret_map.items():
            try:
                secret = client.get_secret(kv_name)
                if secret.value:
                    secrets[env_name] = secret.value
            except Exception:
                pass  # Secret may not exist yet
        if secrets:
            logger.info("Loaded %d secret(s) from Key Vault", len(secrets))
        return secrets
    except ImportError:
        logger.debug("azure-keyvault-secrets not installed — skipping Key Vault")
        return {}
    except Exception as e:
        logger.warning("Key Vault access failed, using env vars: %s", e)
        return {}


_kv_secrets = _load_keyvault_secrets()


def _get(env_name: str, default: str = "") -> str:
    """Get config value: Key Vault secret > env var > default."""
    return _kv_secrets.get(env_name, os.getenv(env_name, default))

# Microsoft Foundry
PROJECT_ENDPOINT: str = _get("PROJECT_ENDPOINT")
MODEL_DEPLOYMENT_NAME: str = _get("MODEL_DEPLOYMENT_NAME", "gpt-5.2")
IMAGE_DEPLOYMENT_NAME: str = _get("IMAGE_DEPLOYMENT_NAME", "gpt-image-1.5")

# Vector Store (cached after first creation)
VECTOR_STORE_ID: str = _get("VECTOR_STORE_ID")

# Foundry IQ / Azure AI Search
AI_SEARCH_ENDPOINT: str = _get("AI_SEARCH_ENDPOINT")
AI_SEARCH_KNOWLEDGE_BASE_NAME: str = _get("AI_SEARCH_KNOWLEDGE_BASE_NAME")
AI_SEARCH_API_KEY: str = _get("AI_SEARCH_API_KEY")
AI_SEARCH_REASONING_EFFORT: str = _get("AI_SEARCH_REASONING_EFFORT", "minimal")

# MCP Server (Microsoft Learn)
MCP_SERVER_URL: str = _get("MCP_SERVER_URL", "https://learn.microsoft.com/api/mcp")

# Azure Cosmos DB
COSMOS_ENDPOINT: str = _get("COSMOS_ENDPOINT")
COSMOS_DATABASE: str = _get("COSMOS_DATABASE", "social-ai-studio")
COSMOS_CONTAINER: str = _get("COSMOS_CONTAINER", "conversations")

# Azure AI token scope (shared across client.py, tools.py, agentic_retrieval.py)
AZURE_AI_SCOPE: str = "https://ai.azure.com/.default"

# Derived: Responses API base URL
# Format: https://<endpoint>/openai/v1/
RESPONSES_API_BASE_URL: str = f"{PROJECT_ENDPOINT}/openai/v1/" if PROJECT_ENDPOINT else ""

# Server
HOST: str = _get("HOST", "0.0.0.0")
PORT: int = int(_get("PORT", "8000"))

# Observability (OpenTelemetry + Application Insights)
APPLICATIONINSIGHTS_CONNECTION_STRING: str = _get("APPLICATIONINSIGHTS_CONNECTION_STRING")
OTEL_SERVICE_NAME: str = _get("OTEL_SERVICE_NAME", "social-ai-studio")

# Evaluation
EVAL_MODEL_DEPLOYMENT: str = _get("EVAL_MODEL_DEPLOYMENT", "gpt-4o-mini")
_parsed_project_endpoint = urlparse(PROJECT_ENDPOINT) if PROJECT_ENDPOINT else None
_derived_eval_endpoint = (
    f"{_parsed_project_endpoint.scheme}://{_parsed_project_endpoint.netloc}"
    if _parsed_project_endpoint and _parsed_project_endpoint.netloc
    else ""
)
EVAL_AZURE_ENDPOINT: str = _get("EVAL_AZURE_ENDPOINT", _derived_eval_endpoint)
EVAL_API_VERSION: str = _get("EVAL_API_VERSION", "2024-10-21")
EVAL_TOKEN_SCOPE: str = _get("EVAL_TOKEN_SCOPE", "https://cognitiveservices.azure.com/.default")

# Content Safety
CONTENT_SAFETY_ENDPOINT: str = _get("CONTENT_SAFETY_ENDPOINT")

# Feature flags
DEBUG: bool = _get("DEBUG", "false").lower() == "true"
SERVE_STATIC: bool = _get("SERVE_STATIC", "false").lower() == "true"

# Key Vault URL (for reference by other modules)
AZURE_KEY_VAULT_URL: str = os.getenv("AZURE_KEY_VAULT_URL", "")
