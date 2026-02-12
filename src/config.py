"""Configuration loader for TechPulse Social.

Loads environment variables from .env and exposes them as module-level constants.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# Azure AI Foundry
PROJECT_ENDPOINT: str = os.getenv("PROJECT_ENDPOINT", "")
MODEL_DEPLOYMENT_NAME: str = os.getenv("MODEL_DEPLOYMENT_NAME", "gpt-5.2")
IMAGE_DEPLOYMENT_NAME: str = os.getenv("IMAGE_DEPLOYMENT_NAME", "gpt-image-1.5")

# Vector Store (cached after first creation)
VECTOR_STORE_ID: str = os.getenv("VECTOR_STORE_ID", "")

# Derived: Responses API base URL
# Format: https://<endpoint>/openai/v1/
RESPONSES_API_BASE_URL: str = (
    f"{PROJECT_ENDPOINT}/openai/v1/" if PROJECT_ENDPOINT else ""
)

# Server
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# Feature flags
DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
