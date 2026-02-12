---
description: 'Python + Azure AI Foundry SDK development guidelines for this hackathon project'
applyTo: '**/*.py'
---

# Python + Agent Framework SDK Guidelines

## SDK Usage

### Client Initialization (Singleton Pattern)

```python
import os
from agent_framework.azure import AzureOpenAIResponsesClient
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv

load_dotenv()

# Create once, reuse everywhere — uses async _get_token callable
credential = DefaultAzureCredential()

async def _get_token() -> str:
    token = credential.get_token("https://ai.azure.com/.default")
    return token.token

client = AzureOpenAIResponsesClient(
    base_url=f"{os.getenv('PROJECT_ENDPOINT')}/openai/v1/",
    deployment_name=os.getenv("MODEL_DEPLOYMENT_NAME"),
    api_key=_get_token,  # async callable
    api_version="2025-05-15-preview",
)
```

### CRITICAL: Monkey-Patch for Input Type Bug

The SDK omits `"type": "message"` on conversation items, causing 400 errors.
Apply this patch once at import time:

```python
from agent_framework.openai._responses_client import RawOpenAIResponsesClient

_original = RawOpenAIResponsesClient._prepare_message_for_openai

def _patched(self, message):
    result = _original(self, message)
    if isinstance(result, dict) and "role" in result and "type" not in result:
        result["type"] = "message"
    return result

RawOpenAIResponsesClient._prepare_message_for_openai = _patched
```

### Tool Definition Pattern (@tool decorator)

```python
from agent_framework import tool
from typing import Annotated

@tool(approval_mode="never_require")
async def generate_content(
    topic: Annotated[str, "コンテンツのトピック"],
    platform: Annotated[str, "対象プラットフォーム (linkedin/x/instagram)"],
    language: Annotated[str, "出力言語 (en/ja)"] = "en",
) -> str:
    """プラットフォーム別に最適化されたコンテンツを生成する"""
    ...

@tool(approval_mode="never_require")
async def review_content(
    content: Annotated[str, "レビュー対象のコンテンツ"],
    platform: Annotated[str, "対象プラットフォーム"],
) -> str:
    """コンテンツを5軸で品質評価しフィードバックを提供する"""
    ...
```

### Agent Creation with Reasoning Options

```python
from agent_framework.openai._responses_client import ReasoningOptions

# Build reasoning options from user settings
reasoning_opts: ReasoningOptions = {
    "effort": reasoning_effort,   # "low" | "medium" | "high"
    "summary": reasoning_summary, # "auto" | "concise" | "detailed"
}

# Create agent with default reasoning config
agent = client.as_agent(
    name="social_ai_studio_agent",
    instructions=SYSTEM_PROMPT,
    tools=[web_search, file_search, generate_content, review_content, generate_image],
    default_options={"reasoning": reasoning_opts},
)

# Stream the response
async for update in agent.run(query, stream=True):
    # update is AgentResponseUpdate
    ...
```

### Hosted Tools Pattern

```python
# Web Search (Bing Grounding) — no config needed
web_search = client.get_web_search_tool()

# File Search (Vector Store) — needs vector_store_ids
file_search = client.get_file_search_tool(
    vector_store_ids=[os.getenv("VECTOR_STORE_ID")],
)

# MCP Tool — for external MCP servers
from agent_framework.mcp import MCPStreamableHTTPTool
mcp_tool = MCPStreamableHTTPTool(url="https://example.com/mcp")
```

### Vector Store Setup (openai SDK)

```python
from openai import AzureOpenAI

openai_client = AzureOpenAI(
    azure_endpoint=os.getenv("PROJECT_ENDPOINT"),
    azure_deployment=os.getenv("MODEL_DEPLOYMENT_NAME"),
    credential=DefaultAzureCredential(),
    api_version="2025-05-15-preview",
)

# Create vector store
vs = openai_client.vector_stores.create(name="brand_guidelines")

# Upload file
with open("data/brand_guidelines.md", "rb") as f:
    file = openai_client.files.create(file=f, purpose="assistants")

# Attach file to vector store
openai_client.vector_stores.files.create(vector_store_id=vs.id, file_id=file.id)
```

### Image Generation (gpt-image-1.5)

```python
@tool(approval_mode="never_require")
async def generate_image(
    prompt: Annotated[str, "画像生成のプロンプト（英語）"],
    platform: Annotated[str, "対象プラットフォーム (linkedin/x/instagram)"],
    style: Annotated[str, "画像スタイル (photo/illustration/minimal)"] = "photo",
) -> str:
    """SNSプラットフォーム向けのビジュアルを生成する"""
    from openai import AzureOpenAI
    img_client = AzureOpenAI(...)
    result = img_client.images.generate(
        model="gpt-image-1.5",
        prompt=prompt,
        size="1024x1024",
        n=1,
        response_format="b64_json",
    )
    return result.data[0].b64_json
```

### Multi-turn Conversation Pattern

```python
def _build_query_with_history(query: str, history_messages: list[dict]) -> str:
    """Build query string with conversation history context."""
    if not history_messages:
        return query
    history_text = "\n".join(
        f"{msg['role']}: {msg['content']}" for msg in history_messages[-6:]
    )
    return f"Previous conversation:\n{history_text}\n\nCurrent query: {query}"
```

### SSE Streaming with Tool Events

```python
# Use markers for SSE event parsing
TOOL_START = "__TOOL_EVENT__"
TOOL_END = "__END_TOOL_EVENT__"
REASONING_START = "__REASONING_REPLACE__"
REASONING_END = "__END_REASONING_REPLACE__"

# Track tool deduplication with sets
emitted_tool_starts: set[str] = set()
emitted_tool_ends: set[str] = set()
call_id_to_name: dict[str, str] = {}
```

## Error Handling

- Always wrap API calls in try/except blocks
- Handle `HttpResponseError` from `azure.core.exceptions`
- Implement exponential backoff for rate limiting (429)
- Log diagnostic information for debugging

```python
import logging

logger = logging.getLogger(__name__)

try:
    async for update in agent.run(query, stream=True):
        yield update
except Exception as e:
    if "429" in str(e) or "RateLimitError" in type(e).__name__:
        retry_after = getattr(e, 'retry_after', 5)
        logger.error(f"Rate limit exceeded. Retry after {retry_after}s")
    else:
        logger.error(f"Agent execution failed: {e}", exc_info=True)
    raise
```

## Python Best Practices for This Project

- Use `pathlib.Path` for all file operations
- Type hint every function signature: `def func(param: str) -> dict[str, Any]:`
- Prefer `dataclasses` or `TypedDict` for structured data
- Use `logging` module, configure at the entry point
- Keep functions small — if a function > 30 lines, consider splitting
- Use `os.getenv()` with `load_dotenv()` for configuration
- Never use bare `except:` — always catch specific exceptions

## Security Rules

- NEVER hardcode endpoints, keys, or secrets
- NEVER log full credential objects or tokens
- Use `DefaultAzureCredential()` — it chains through available auth methods
- Keep `.env` out of version control
