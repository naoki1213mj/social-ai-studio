# Hackfest TechConnect 2026 - Reasoning Agents with Microsoft Foundry

## Project Overview

This is a hackathon project for **Agents League @ TechConnect 2026** — **Reasoning Agents** track.
We are building an AI-powered **social media content creation pipeline** ("Social AI Studio") that assists marketing and communication teams in creating platform-optimized content for LinkedIn, X/Twitter, and Instagram. The tool is designed to be brand-agnostic — adaptable to any company or industry via uploadable brand guidelines.

The system features:
- **gpt-5.2** reasoning agent with controllable reasoning depth and thinking display
- **File Search** grounding against brand guidelines via Azure AI Vector Store
- **Web Search** (Bing Grounding) for real-time trend research
- **MCP Server** integration (Microsoft Learn documentation via Streamable HTTP)
- **GPT Image generation** (gpt-image-1.5) for social media visuals
- **A/B Content Comparison** — generate two content variants with different strategies
- **Structured JSON output** parsed into platform-specific content cards
- **Real-time SSE streaming** with reasoning process and tool usage visualization
- **Reasoning phase indicators** (CoT → ReAct → Self-Reflection) visible in the UI
- **Content Safety** — Azure AI Content Safety (prompt shield + text moderation) with dynamic UI badge

Future roadmap includes multi-agent pipeline (Ideation → Creator → Reviewer).

- **Deadline**: Feb 13, 2026 at 11:59 PM PT
- **Platform**: Microsoft Foundry
- **Models**: gpt-5.2 (reasoning), gpt-image-1.5 (image generation)
- **SDK**: agent-framework-core (Responses API + @tool decorator)
- **Authentication**: DefaultAzureCredential (Azure CLI login)
- **Language**: Python 3.12 + TypeScript 5
- **Package Manager**: uv (Python), npm (frontend)

## Architecture

```
.
├── .github/              # Copilot instructions, custom rules & CI/CD workflows
│   ├── copilot-instructions.md
│   ├── instructions/     # Security & Python-Foundry rules
│   └── workflows/        # GitHub Actions (ci.yml, deploy.yml, security.yml)
├── src/
│   ├── config.py         # Configuration loader (env vars + Key Vault secrets)
│   ├── client.py         # AzureOpenAIResponsesClient singleton + monkey-patch
│   ├── agent.py          # Agent creation, reasoning options, SSE streaming
│   ├── tools.py          # Custom tools (generate_content, review_content, generate_image)
│   ├── vector_store.py   # Vector Store setup & FileSearchTool provisioning
│   ├── database.py       # Cosmos DB conversation history (in-memory fallback)
│   ├── agentic_retrieval.py # Foundry IQ Agentic Retrieval tool
│   ├── telemetry.py      # OpenTelemetry + Azure Monitor setup
│   ├── evaluation.py     # Foundry Evaluation integration
│   ├── content_safety.py # Azure AI Content Safety (text analysis + prompt shield)
│   ├── models.py         # Pydantic data models (ChatRequest, etc.)
│   ├── prompts/          # System prompt module (external)
│   │   └── system_prompt.py
│   └── api.py            # FastAPI + SSE streaming endpoint
├── frontend/             # React 19 + TypeScript + Vite + Tailwind v3
│   ├── src/
│   │   ├── components/   # InputForm, ContentCards, ContentDisplay, ReasoningPanel,
│   │   │                 # ToolEvents, ABCompareCards, HistorySidebar, SuggestedQuestions, Header
│   │   ├── hooks/        # useTheme, useI18n
│   │   └── lib/          # api.ts (SSE client), i18n.ts (EN/JA/KO/ZH/ES)
│   ├── package.json
│   └── vite.config.ts
├── data/                 # Grounding data
│   └── brand_guidelines.md
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md   # Azure architecture (resources, Mermaid diagrams)
│   ├── DESIGN.md         # Architecture design document
│   └── SPEC.md           # Technical specification
├── infra/                # Bicep IaC (VNet + Key Vault + Private Endpoints + Container Apps)
│   ├── main.bicep
│   ├── main.parameters.json
│   ├── abbreviations.json
│   └── provision.sh      # One-time infra provisioning script
├── .env                  # Environment variables (gitignored)
├── .env.example          # Example config with placeholders
├── pyproject.toml        # Python project config (uv)
└── README.md
```

## Key Patterns

### Microsoft Foundry Agent Service (agent-framework-core)

- Use `AzureOpenAIResponsesClient` from `agent_framework.azure` as the main entry point
- Use `DefaultAzureCredential` from `azure.identity` — never hardcode API keys
- Reuse a **singleton** `AzureOpenAIResponsesClient` instance; do not create new instances repeatedly
- Create agents via `client.as_agent(name=..., instructions=..., tools=[...], default_options=...)`
- Pass `default_options={"reasoning": {"effort": ..., "summary": ...}}` to control gpt-5.2 reasoning
- The `OpenAIResponsesOptions` TypedDict supports: `reasoning`, `temperature`, `max_tokens`, `response_format`, etc.
- `ReasoningOptions` TypedDict: `effort` ("low"|"medium"|"high"), `summary` ("auto"|"concise"|"detailed")
- Stream responses via `agent.run(query, stream=True)` → yields `AgentResponseUpdate`
- Define custom tools with `@tool(approval_mode="never_require")` + `Annotated` type hints
- Handle `429 (Request Rate Too Large)` with retry-after logic
- Use async APIs where available for better throughput
- Load config from environment variables via `python-dotenv`; in production, secrets (`PROJECT_ENDPOINT`, etc.) are auto-loaded from Azure Key Vault when `AZURE_KEY_VAULT_URL` is set

### Hosted Tools

- **Web Search**: `AzureOpenAIResponsesClient.get_web_search_tool()` — Bing Grounding for real-time trends
- **File Search**: `AzureOpenAIResponsesClient.get_file_search_tool(vector_store_ids=[...])` — needs Vector Store ID
- **MCP**: `AzureOpenAIResponsesClient.get_mcp_tool(name="microsoft_learn", url=MCP_SERVER_URL, ...)` — Microsoft Learn Docs (Streamable HTTP)
  - Server URL: `https://learn.microsoft.com/api/mcp` (no auth required)
  - Allowed tools: `microsoft_docs_search`, `microsoft_docs_fetch`, `microsoft_code_sample_search`
  - Agent uses MCP to verify technical claims and enrich content with official references

### Vector Store Setup

- Use `openai.resources.VectorStores` via the openai SDK (v2.20+) to create/manage vector stores
- Upload `data/brand_guidelines.md` to a vector store at startup if not already created
- Cache the `VECTOR_STORE_ID` in `.env` after first creation
- Pass `vector_store_ids=[...]` to `get_file_search_tool()`

### Image Generation

- Use `openai.OpenAI` client's `responses.create()` with `tools=[{"type": "image_generation"}]` for gpt-image-1.5
- Client initialized with `RESPONSES_API_BASE_URL` as `base_url` and `DefaultAzureCredential` token
- Custom `@tool` named `generate_image` with parameters: `prompt`, `platform`, `style`
- Returns metadata JSON (image data stored via `ContextVar` side-channel, NOT returned to LLM context)
- Deployment name: `gpt-image-1.5`

### Reasoning Patterns

All three reasoning patterns are integrated into a **single system prompt**:

1. **Chain-of-Thought (CoT)**: Strategic analysis phase — step-by-step topic analysis
2. **ReAct (Reasoning + Acting)**: Content creation phase — tool use + reasoning
3. **Self-Reflection**: Quality review phase — self-evaluate and improve

The single agent autonomously progresses through all phases.

### Agent Design (Single Agent + Multi-Tool)

- **Architecture**: One agent with 7 tools
- Hosted tools: `web_search` (Bing Grounding), `file_search` (Vector Store), `mcp` (Microsoft Learn Docs)
- Custom tools: `generate_content`, `review_content`, `generate_image`, `search_knowledge_base`
- All custom tools use `@tool(approval_mode="never_require")` decorator with `Annotated` parameters
- Agent created via `AzureOpenAIResponsesClient.as_agent()` — Responses API v1
- The LLM decides which tools to use and in what order based on context
- System prompt embeds CoT + ReAct + Self-Reflection directives
- System prompt instructs structured JSON output for platform-specific content
- `get_system_prompt(ab_mode=True)` appends A/B comparison addendum for dual-variant generation

### A/B Content Comparison

- Toggle in InputForm AI Settings panel enables A/B mode
- System prompt addendum instructs agent to produce two content variants with different strategies
- JSON schema: `{mode: "ab", variant_a: {strategy, contents, review}, variant_b: {strategy, contents, review}, sources_used}`
- Frontend renders `ABCompareCards` with side-by-side comparison, winner badge, mini radar charts
- User can select preferred variant to expand into full ContentCards view with all HITL/export features

### SSE Streaming Design

- Stream reasoning tokens, tool events, and text content via SSE
- Use `__TOOL_EVENT__` / `__END_TOOL_EVENT__` markers (from fabric-foundry-agentic-starter)
- Use `__REASONING_REPLACE__` / `__END_REASONING_REPLACE__` markers for cumulative reasoning
- Event types: `reasoning`, `tool_start`, `tool_end`, `text`, `done`, `error`
- Frontend displays reasoning in collapsible panels and tool usage in timeline

### Frontend Features

- 🧠 Reasoning process display (collapsible ReasoningIndicator — purple/indigo gradient)
- 🔧 Tool usage pills (always-visible animated badges with gradient glow — Web Search, File Search, etc.)
- 📊 Quality radar chart (recharts RadarChart — 5-axis scoring with overall score gradient)
- 🛡️ Content Safety badge (dynamic — real Azure AI Content Safety analysis, not just visual)
- 📈 Processing metrics (reasoning chars, tools used, output chars — post-generation stats bar)
- ⚙️ AI Settings panel (reasoning effort: low/medium/high, reasoning summary: off/auto/concise/detailed)
- 💡 Suggested questions (empty-state grid with clickable samples)
- 🖼️ Platform-specific content cards (LinkedIn / X / Instagram) with images
- 📋 Per-platform copy to clipboard
- 🌐 i18n (EN/JA/KO/ZH/ES) for UI labels and content generation
- 🌙 Dark/Light mode (Tailwind dark: classes)
- 📝 Markdown rendering (react-markdown)
- ✨ Glassmorphism UI (frosted glass cards, backdrop blur, gradient backgrounds)
- 🎨 Gradient design system (submit button, header, animated borders)

### CI/CD Pipeline (GitHub Actions)

- **CI** (`ci.yml`): Ruff lint + pytest (123 tests) + Frontend tsc + build — triggered on push/PR to main
- **Deploy** (`deploy.yml`): CI gate → ACR build (commit SHA + latest tags) → Container App update → health check — triggered on push to main
- **Security** (`security.yml`): Trivy filesystem scan → Gitleaks secret detection → npm audit + pip-audit — triggered on push/PR/weekly
- Deploy uses **OIDC Workload Identity Federation** via `azure/login@v2` with GitHub Variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`)
- Ruff config: `target-version = "py312"`, `line-length = 120`, `select = ["E", "F", "I", "W"]`, `ignore = ["E501", "E402"]`

## Coding Standards

### Python Conventions

- Follow **PEP 8** style guide
- Use **type hints** on all function signatures
- Write **docstrings** (PEP 257) for all public functions and classes
- Use `logging` module instead of `print()` for diagnostics
- Handle exceptions gracefully with specific exception types
- Use `pathlib.Path` for file path operations
- Prefer f-strings for string formatting

### Project Conventions

- Use `uv` for dependency management (not pip directly)
- Store configuration in `.env` files, load with `python-dotenv`
- Never commit secrets, API keys, or Azure subscription details
- All code should be in the `src/` directory
- Keep the main entry point clean and delegate to modules

### Security (CRITICAL — Public Repository)

- ❌ **NEVER** include API keys, passwords, tokens, or credentials in code
- ❌ **NEVER** include customer data or PII
- ❌ **NEVER** include Azure subscription IDs, resource names, or connection strings
- ✅ Use environment variables for all sensitive configuration
- ✅ Use `DefaultAzureCredential` for authentication
- ✅ Keep `.env` in `.gitignore`
- ✅ Provide `.env.example` with placeholder values only

## Judging Criteria

Projects are evaluated on:
1. **Accuracy & Relevance (25%)** — Meets challenge requirements
2. **Reasoning & Multi-step Thinking (25%)** — Clear problem-solving approach
3. **Creativity & Originality (20%)** — Novel ideas or unexpected execution
4. **User Experience & Presentation (15%)** — Clear documentation, screenshots/video
5. **Technical Implementation (15%)** — Solid patterns, creative use of tools

## Quick Reference Links

- [Foundry Agent Service Overview](https://learn.microsoft.com/azure/ai-foundry/agents/overview?view=foundry)
- [Quickstart: Create agent with Python SDK](https://learn.microsoft.com/azure/ai-foundry/agents/quickstart-sdk?view=foundry-classic&pivots=python-sdk)
- [File Search tool](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/file-search?view=foundry&pivots=python)
- [Bing Search tool](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/bing-tools?view=foundry&pivots=python)
- [Microsoft Learn MCP Server](https://github.com/microsoftdocs/mcp)
