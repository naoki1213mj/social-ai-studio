# Social AI Studio — AI-Powered Social Media Content Studio

![Python 3.12](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Tests](https://img.shields.io/badge/tests-123%20passed-brightgreen)
![CI](https://github.com/naoki1213mj/social-ai-studio/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/naoki1213mj/social-ai-studio/actions/workflows/deploy.yml/badge.svg)
![Security](https://github.com/naoki1213mj/social-ai-studio/actions/workflows/security.yml/badge.svg)
![Azure](https://img.shields.io/badge/Azure-Foundry-0078d4?logo=microsoftazure)
![License](https://img.shields.io/badge/license-Hackathon-orange)

> **Agents League @ TechConnect 2026** — Reasoning Agents Track

🌐 **English** | [日本語](README.ja.md)

An AI-powered content creation pipeline that assists marketing and communication teams in creating platform-optimized social media content for LinkedIn, X (Twitter), and Instagram — adaptable to any brand or industry.

## 🚀 Snapshot

Single reasoning agent (gpt-5.2) × 7 tools × 3-phase thinking pipeline × production-grade observability.

## 🎬 Demo

![Full Pipeline Demo](docs/demo-full-pipeline.png)

*End-to-end content generation pipeline: topic input → AI Settings → 3-phase reasoning (CoT → ReAct → Self-Reflection) → 7 tool executions → A/B content comparison → variant selection → platform-specific content cards (LinkedIn / X) with AI-generated images → quality review (8.7/10) → HITL actions → export.*

## ✨ Key Features at a Glance

| Category | Feature |
|----------|---------|
| 🧠 **Reasoning** | 3-phase pipeline (CoT → ReAct → Self-Reflection) with live phase badges + progress stepper |
| 🔧 **7 Agent Tools** | Web Search, File Search, MCP Docs, Foundry IQ, Content Gen, Review, Image Gen |
| 🎯 **A/B Comparison** | Two content variants with different strategies, side-by-side radar charts |
| 👤 **HITL Workflow** | Approve ✅ / Edit ✏️ / Refine 🔄 per platform card |
| 📊 **Quality Scoring** | 5-axis radar chart + Foundry Evaluation (Relevance, Coherence, Fluency, Groundedness) |
| 🔍 **Observability** | OpenTelemetry → Azure Application Insights → Foundry Tracing |
| 🛡️ **Content Safety** | Azure AI Content Safety (text analysis + prompt shield) with real-time badge |
| 🖼️ **Image Generation** | gpt-image-1.5 creates platform-optimized visuals (LinkedIn 1.91:1, Instagram 1:1) |
| 💾 **Persistence** | Cosmos DB conversation history (Private Endpoint) with per-user separation and in-memory fallback |
| 🔑 **Secret Management** | Azure Key Vault with Private Endpoint + RBAC |
| 🌐 **5-Language i18n** | EN / JA / KO / ZH / ES with flag-based selector |
| 🌏 **Bilingual Mode** | EN + JA simultaneous generation — Parallel (separate posts) or Combined (EN+JA in one post) |
| 📝 **16 Content Types** | Product launch, thought leadership, event recap, case study, tutorial, custom freeform, and more |
| 🌙 **Dark / Light Mode** | System-preference-aware theme switching |
| ✨ **Glassmorphism UI** | Frosted glass, gradient borders, animated tool pills |
| 🚀 **One-Command Deploy** | `azd up` → Azure Container Apps |
| ⚙️ **CI/CD Pipeline** | GitHub Actions: Lint → Test → Build → Deploy → Health Check |
| 🛡️ **Security Scanning** | Trivy vulnerability scan + Gitleaks secret detection + dependency audit |
| ✅ **123 Unit Tests** | Comprehensive backend test suite |

## 🏗️ Architecture

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 25, 'rankSpacing': 60, 'curve': 'basis'}}}%%
graph LR
    subgraph Frontend["🖥️ Frontend<br/>React 19 + TypeScript + Vite"]
        UI["InputForm<br/>+ AI Settings"]
        Display["Content Cards / A-B Compare<br/>Reasoning Panel / Tool Pills"]
        HITL["HITL Controls<br/>Approve · Edit · Refine · Export"]
    end

    subgraph Backend["⚙️ Backend — FastAPI"]
        API["SSE Streaming API<br/>/api/chat · /evaluate · /conversations"]
        Agent["gpt-5.2<br/>Reasoning Agent"]
    end

    subgraph Tools["🔧 7 Agent Tools"]
        direction TB
        Hosted["🌐 Web Search — Bing<br/>📁 File Search — Vector Store<br/>📘 MCP — Microsoft Learn<br/>🔍 Foundry IQ — AI Search"]
        Custom["✏️ generate_content<br/>📋 review_content<br/>🖼️ generate_image"]
    end

    subgraph Azure["☁️ Microsoft Foundry + Azure"]
        direction TB
        Models["gpt-5.2 · gpt-image-1.5"]
        Data["Vector Store · Bing Grounding<br/>Azure AI Search · Cosmos DB"]
        Ops["Application Insights<br/>Foundry Evaluation"]
    end

    UI -- "ChatRequest + SSE" --> API
    API -- "stream=True" --> Agent
    Agent --> Tools
    Hosted & Custom --> Azure
    Agent -- "Structured JSON" --> API
    API -- "SSE Events" --> Display
    Display --> HITL
    HITL -- "Refine feedback" --> API
    API -- "Save / Query" --> Data
    Agent --> Models
    API -. "Traces" .-> Ops
```

### ☁️ Azure Infrastructure

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 20, 'rankSpacing': 50, 'curve': 'basis'}}}%%
graph LR
    subgraph GitHub["GitHub"]
        Repo["📦 Repository"]
        Actions["⚙️ GitHub Actions<br/>CI / Deploy / Security"]
    end

    subgraph Azure["Azure — East US 2"]
        subgraph Network["VNet (10.0.0.0/16)"]
            subgraph Compute["snet-container-apps"]
                CA["🐳 Container App<br/>VNet-integrated<br/>System Managed Identity"]
            end
            subgraph PEs["snet-private-endpoints"]
                PECosmos["🔒 PE: Cosmos DB"]
                PEKV["🔒 PE: Key Vault"]
            end
        end

        subgraph Security["Secrets"]
            KV["🔑 Key Vault<br/>RBAC + Private Endpoint"]
        end

        ACR["📦 ACR<br/>crtechpulseprod"]

        subgraph AI["AI Services"]
            Foundry["🧠 AI Foundry<br/>+ Project"]
            GPT52["gpt-5.2"]
            GPTImg["gpt-image-1.5"]
            Bing["🔍 Bing Grounding"]
            Safety["🛡️ Content Safety"]
        end

        subgraph Data["Data & Observability"]
            Cosmos["💾 Cosmos DB<br/>Private Endpoint only"]
            VS["📁 Vector Store"]
            AISearch["🔍 AI Search<br/>(Foundry IQ)"]
            AppInsights["📊 Application Insights"]
        end
    end

    MCP["📘 MCP Server<br/>learn.microsoft.com"]

    Repo -->|push| Actions
    Actions -->|az acr build| ACR
    Actions -->|az containerapp update| CA
    ACR -->|pull| CA
    CA -->|Managed Identity| KV
    CA -->|Private Endpoint| PECosmos
    PECosmos --> Cosmos
    CA -->|Private Endpoint| PEKV
    PEKV --> KV
    CA -->|Responses API| Foundry
    Foundry --> GPT52 & GPTImg
    CA --> Bing & VS & AISearch & Safety
    CA --> MCP
    CA -.->|OTel| AppInsights
```

> 📄 Full resource inventory → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🧠 Reasoning Pipeline (3-Phase)

All three reasoning patterns are integrated into a **single system prompt** — the agent autonomously progresses through each phase. The UI displays **live phase badges** that highlight the active stage:

| Phase | Pattern | What Happens | UI Indicator |
|-------|---------|-------------|-------------|
| 1 | **Chain-of-Thought (CoT)** | Strategic analysis — topic decomposition, audience identification, key message planning | 💭 Indigo badge (pulsing) |
| 2 | **ReAct (Reasoning + Acting)** | Content creation — web search → file search → MCP docs → content generation, interleaved with reasoning | ⚡ Amber badge (pulsing) |
| 3 | **Self-Reflection** | Quality review — self-evaluate on 5 axes, revise if any score < 7 | 🔍 Emerald badge (pulsing) |

The user controls reasoning depth (`low`/`medium`/`high`) and thinking display (`off`/`auto`/`concise`/`detailed`) via the AI Settings panel.

## 🔧 Agent Tools (7 Total)

| Tool | Type | Purpose |
|------|------|---------|
| `web_search` | Hosted (Bing Grounding) | Real-time trend research and latest news |
| `file_search` | Hosted (Vector Store) | Brand guidelines grounding |
| `mcp` | Hosted (MCP Server) | Microsoft Learn docs — technical claim verification |
| `search_knowledge_base` | Custom (@tool) | Foundry IQ Agentic Retrieval — deep document search |
| `generate_content` | Custom (@tool) | Platform-optimized content generation with LinkedIn/X/Instagram rules |
| `review_content` | Custom (@tool) | 5-axis quality scoring + improvement feedback |
| `generate_image` | Custom (@tool) | gpt-image-1.5 visual generation |

## 🔍 Observability & Evaluation

### OpenTelemetry + Azure Application Insights

Production-grade distributed tracing across the entire reasoning pipeline:

- **Pipeline span** — covers the full agent execution with attributes (reasoning effort, platforms, tool count)
- **Tool spans** — individual spans for each tool invocation (start → complete with duration)
- **Auto-instrumented** — FastAPI requests, HTTP calls, Azure SDK operations
- **Agent framework instrumentation** — agent-framework-core's built-in OTel support via `enable_instrumentation()`

Traces flow to:

- **Azure Application Insights** → End-to-end transaction view, Live Metrics
- **Microsoft Foundry** → Observability → Traces (auto-correlated with agent runs)

```python
# Automatic setup — just set APPLICATIONINSIGHTS_CONNECTION_STRING in .env
from src.telemetry import setup_telemetry
setup_telemetry()  # Configures OTel → Azure Monitor before FastAPI init
```

### Foundry Evaluation (azure-ai-evaluation SDK)

AI-assisted quality metrics for generated content:

| Metric | Scale | What It Measures |
|--------|-------|-----------------|
| **Relevance** | 1-5 | Does the content address the user's topic? |
| **Coherence** | 1-5 | Is the content logically structured? |
| **Fluency** | 1-5 | Is the language natural and well-written? |
| **Groundedness** | 1-5 | Is the content grounded in provided context? |

These complement the agent's built-in 5-axis self-review (brand alignment, platform optimization, engagement potential, factual accuracy, content quality) for a **dual evaluation system**.

## 🛡️ Content Safety

Azure AI Content Safety integration provides multi-layered protection:

### Input Protection — Prompt Shield

- Detects **prompt injection attacks** in user input before agent processing
- Blocks malicious prompts with clear error messages
- Uses `ShieldPromptOptions` from Azure AI Content Safety SDK

### Output Moderation — Text Analysis

- Analyzes generated content across **4 harm categories**: Hate, SelfHarm, Sexual, Violence
- Configurable severity threshold (default: 2 on 0-6 scale)
- Results sent via SSE as a `safety` event — dynamic badge in the UI

### Safety Badge

- 🟢 **Content Safe** — All categories below threshold
- 🔴 **Safety Issue** — One or more categories flagged
- ⚪ **Checking...** — Analysis in progress

Gracefully optional — if `CONTENT_SAFETY_ENDPOINT` is not set, safety checks are skipped and content flows normally.

## 👤 Human-in-the-Loop (HITL) Workflow

Each platform content card includes:

- **✅ Approve** — Mark content as approved (visual stamp appears)
- **✏️ Edit** — Inline text editing with save/cancel
- **🔄 Refine** — Send natural language feedback to the AI agent for targeted improvement

The Refine feature sends a follow-up message to the same conversation thread, allowing the agent to improve specific platform content while preserving context.

## 🎯 A/B Content Comparison

Toggle A/B mode in AI Settings to generate **two content variants with different strategies**:

- Side-by-side comparison cards with mini radar charts
- Winner badge highlighting the stronger variant
- Select preferred variant to expand into full ContentCards view with all HITL/export features

## 📦 Content Export

- **📥 Export as Markdown** — Structured `.md` with content, hashtags, CTAs, quality scores, and sources
- **📥 Export as JSON** — Raw structured output for CMS integration

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Models** | gpt-5.2 (reasoning), gpt-image-1.5 (image generation) |
| **Platform** | Microsoft Foundry |
| **Agent SDK** | agent-framework-core (Responses API + `@tool` decorator) |
| **Grounding** | File Search (Vector Store), Web Search (Bing), MCP (Microsoft Learn), Foundry IQ (Agentic Retrieval) |
| **Observability** | OpenTelemetry → Azure Application Insights → Foundry Tracing |
| **Evaluation** | azure-ai-evaluation SDK (Relevance, Coherence, Fluency, Groundedness) |
| **Database** | Azure Cosmos DB (conversation history, Private Endpoint, in-memory fallback) |
| **Secret Management** | Azure Key Vault (RBAC, Private Endpoint) |
| **Auth** | DefaultAzureCredential (Azure CLI / Managed Identity) |
| **Networking** | VNet-integrated Container Apps + Private Endpoints (Cosmos DB, Key Vault) |
| **Backend** | FastAPI + uvicorn (SSE streaming) |
| **Frontend** | React 19 + TypeScript 5 + Vite 7 + Tailwind CSS v3 |
| **UI Components** | lucide-react icons, react-markdown, recharts (radar charts) |
| **Deployment** | Azure Container Apps via azd (multi-stage Docker build) |
| **CI/CD** | GitHub Actions (CI + Deploy + Security Scan) |
| **Package Mgr** | uv (Python), npm (Node.js) |
| **Testing** | pytest + pytest-asyncio (123 tests) |

## 🚀 Quick Start

### Prerequisites

- Python 3.12+ with [uv](https://docs.astral.sh/uv/)
- Node.js 20+
- Azure CLI logged in (`az login`)
- Access to a Microsoft Foundry project with gpt-5.2 and gpt-image-1.5 deployments
- Bing Grounding connection configured in the Foundry project

### Setup

```bash
# Clone
git clone https://github.com/naoki1213mj/social-ai-studio.git
cd social-ai-studio

# Environment variables
cp .env.example .env
# Edit .env with your PROJECT_ENDPOINT

# Backend
uv sync
uv run python -m src.api
# Vector Store is auto-created on first startup

# Frontend (separate terminal)
cd frontend
npm install
npx vite
```

Open <http://localhost:5173> in your browser.

### Deploy to Azure

Deploy to Azure Container Apps with a single command using [Azure Developer CLI (azd)](https://learn.microsoft.com/azure/developer/azure-developer-cli/):

```bash
azd auth login
azd up
```

This builds a multi-stage Docker image (Node.js frontend → Python backend) and deploys it to Azure Container Apps with managed identity.

### CI/CD Pipeline (GitHub Actions)

Push to `main` triggers the full pipeline automatically:

```
git push → Lint (Ruff) → Test (123 pytest) → Build (ACR) → Deploy (Container Apps) → Health Check
```

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **CI** (`ci.yml`) | push / PR | Ruff lint + pytest + TypeScript type check |
| **Deploy** (`deploy.yml`) | push to main | Docker build → ACR → Container App update |
| **Security** (`security.yml`) | push / PR / weekly | Trivy + Gitleaks + dependency audit |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full Azure architecture documentation.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PROJECT_ENDPOINT` | Microsoft Foundry project endpoint (or via Key Vault) | **Yes** |
| `MODEL_DEPLOYMENT_NAME` | Reasoning model deployment | **Yes** |
| `IMAGE_DEPLOYMENT_NAME` | Image model deployment | **Yes** |
| `AZURE_KEY_VAULT_URL` | Key Vault URL (secrets auto-loaded in production) | No |
| `VECTOR_STORE_ID` | Auto-generated on first run | No |
| `COSMOS_ENDPOINT` | Cosmos DB endpoint | No |
| `COSMOS_DATABASE` | Cosmos DB database name | No |
| `COSMOS_CONTAINER` | Cosmos DB container name | No |
| `AI_SEARCH_ENDPOINT` | Azure AI Search endpoint (Foundry IQ) | No |
| `AI_SEARCH_KNOWLEDGE_BASE_NAME` | Knowledge Base name | No |
| `AI_SEARCH_API_KEY` | AI Search admin key (optional if using MI) | No |
| `AI_SEARCH_REASONING_EFFORT` | Retrieval reasoning effort (minimal/low/medium) | No |
| `CONTENT_SAFETY_ENDPOINT` | Azure AI Content Safety endpoint (or via Key Vault) | No |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights for distributed tracing | No |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name | No |
| `EVAL_MODEL_DEPLOYMENT` | Model for Foundry Evaluation | No |
| `DEBUG` | Enable debug logging | No |

## 📁 Project Structure

```text
├── .github/
│   ├── copilot-instructions.md  # Copilot custom instructions
│   ├── instructions/            # Security & Python-Foundry rules
│   └── workflows/               # GitHub Actions (CI / Deploy / Security)
├── src/
│   ├── config.py            # Environment configuration
│   ├── client.py            # AzureOpenAIResponsesClient singleton
│   ├── agent.py             # Agent creation, reasoning pipeline, SSE streaming, OTel tracing
│   ├── tools.py             # Custom tools: generate_content, review_content, generate_image
│   ├── vector_store.py      # Vector Store auto-creation & File Search provisioning
│   ├── database.py          # Cosmos DB conversation history (in-memory fallback)
│   ├── agentic_retrieval.py # Foundry IQ Agentic Retrieval tool
│   ├── telemetry.py         # OpenTelemetry + Azure Monitor setup
│   ├── evaluation.py        # Foundry Evaluation integration (azure-ai-evaluation)
│   ├── content_safety.py    # Azure AI Content Safety (text analysis + prompt shield)
│   ├── models.py            # Pydantic data models
│   ├── prompts/
│   │   └── system_prompt.py # 3-phase reasoning prompt (CoT + ReAct + Self-Reflection)
│   └── api.py               # FastAPI endpoints (SSE streaming, evaluation, static serving)
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main application w/ HITL + retry + elapsed timer
│   │   ├── components/
│   │   │   ├── InputForm.tsx     # Topic input + AI Settings (16 content types + custom)
│   │   │   ├── ContentCards.tsx  # Platform cards + HITL + Export + Foundry Eval
│   │   │   ├── ContentDisplay.tsx # JSON → Cards parser + Skeleton
│   │   │   ├── PhasesStepper.tsx  # 3-phase pipeline progress indicator
│   │   │   ├── ReasoningPanel.tsx # Collapsible panel + Phase Badges
│   │   │   ├── ToolEvents.tsx    # Animated tool usage pills
│   │   │   ├── ABCompareCards.tsx # A/B variant comparison
│   │   │   ├── HistorySidebar.tsx # Conversation history
│   │   │   ├── SuggestedQuestions.tsx
│   │   │   └── Header.tsx
│   │   ├── hooks/            # useTheme, useI18n
│   │   └── lib/              # api.ts (SSE client), i18n.ts (5 languages)
│   ├── vite.config.ts
│   └── package.json
├── tests/                    # 123 unit tests (pytest + pytest-asyncio)
├── infra/
│   ├── main.bicep            # Azure infrastructure (ACR + Container Apps)
│   └── main.parameters.json
├── data/
│   └── brand_guidelines.md   # Sample brand guide (uploaded to Vector Store)
├── docs/
│   ├── ARCHITECTURE.md      # Azure architecture documentation
│   ├── DESIGN.md             # Architecture design document
│   └── SPEC.md               # Technical specification
├── Dockerfile                # Multi-stage build (Node frontend + Python backend)
├── azure.yaml                # Azure Developer CLI project config
├── pyproject.toml
└── .env.example
```

## 📋 API Reference

### `POST /api/chat` — Streaming Chat

```json
{
  "message": "AIの最新トレンドについて",
  "platforms": ["linkedin", "x", "instagram"],
  "content_type": "tech_insight",
  "language": "ja",
  "reasoning_effort": "high",
  "reasoning_summary": "detailed",
  "ab_mode": false,
  "bilingual": false,
  "bilingual_style": "parallel"
}
```

Returns SSE stream:

- `{"type": "reasoning_update", "reasoning": "..."}` — Thinking tokens
- `__TOOL_EVENT__...__END_TOOL_EVENT__` — Tool usage events
- `{"choices": [...], "thread_id": "..."}` — Content chunks
- `{"type": "safety", "safety": {...}}` — Content Safety analysis result
- `{"type": "done"}` — Completion signal

### `POST /api/evaluate` — Content Quality Evaluation

```json
{
  "query": "AI trends 2026",
  "response": "Generated content text...",
  "context": "Optional grounding context..."
}
```

Returns: `{"relevance": 4.5, "coherence": 5.0, "fluency": 4.0, "groundedness": 4.5}`

### `POST /api/safety` — Content Safety Analysis

```json
{
  "text": "Text to analyze...",
  "check_prompt_injection": true
}
```

Returns: `{"safe": true, "categories": {...}, "prompt_shield": {...}, "summary": "..."}`

### `GET /api/health`

```json
{"status": "ok", "service": "social-ai-studio", "version": "0.4.0", "observability": "opentelemetry", "content_safety": "enabled"}
```

### Other Endpoints

- `GET /api/conversations` — List all conversations
- `GET /api/conversations/{id}` — Get conversation with messages
- `DELETE /api/conversations/{id}` — Delete conversation

## ✨ Frontend Features

### Content & Generation

- **Platform Content Cards** — LinkedIn (blue), X (gray), Instagram (pink) with per-card copy
- **Reasoning Phase Badges** — Live CoT → ReAct → Self-Reflection indicators with pulse animation
- **3-Phase Progress Stepper** — Always-visible pipeline progress indicator (CoT → ReAct → Self-Reflection)
- **Tool Usage Pills** — Animated gradient-glow badges (Web Search, File Search, MCP, Content Gen, etc.)
- **Quality Radar Chart** — 5-axis recharts visualization with overall score
- **Content Safety Badge** — Dynamic badge based on Azure AI Content Safety analysis
- **Processing Metrics** — Post-generation stats bar (reasoning chars, tools used, output chars)
- **A/B Compare Cards** — Side-by-side variants with mini radar charts and winner badge

### Interaction

- **HITL Controls** — Approve / Edit / Refine per card with inline editing
- **Conversation History** — Collapsible sidebar with persistent conversation list
- **Content Export** — Download as Markdown (.md) or JSON
- **Stop / Retry** — Abort or retry generation with one click
- **Keyboard Shortcuts** — Ctrl+Enter to submit, Escape to stop
- **Suggested Questions** — Empty-state grid with 4 clickable examples

### Design

- **Glassmorphism UI** — Frosted glass cards, gradient backgrounds, backdrop blur
- **Gradient Design** — Animated gradient borders, brand gradient header
- **Skeleton Loading** — Shimmer placeholders during generation
- **Card Animations** — Staggered fade-in on content card appearance
- **Platform-Specific Images** — LinkedIn/X landscape (1.91:1), Instagram square (1:1) with dimension labels
- **16 Content Types** — Including event recap, custom freeform input, and more
- **Bilingual Mode** — EN + JA with Parallel (separate posts) / Combined (EN+JA in one post) style selector
- **Foundry Evaluation Button** — One-click "Evaluate with Foundry" with 4-axis score display
- **Dark / Light Mode** — System-preference-aware
- **5-Language i18n** — EN / JA / KO / ZH / ES with flag selector

## 🏆 Judging Criteria Mapping

| Criteria | Weight | How Social AI Studio Addresses It |
|----------|--------|-----------------------------------|
| **Accuracy & Relevance** | 25% | 7 tools (web search, file search, MCP, Foundry IQ, content gen, review, image gen), brand grounding via Vector Store, Foundry Evaluation (Relevance + Groundedness scoring), dual quality assessment |
| **Reasoning & Multi-step Thinking** | 25% | 3-phase pipeline (CoT → ReAct → Self-Reflection), live phase badges, controllable depth (low/medium/high), OpenTelemetry tracing of reasoning pipeline with per-tool spans |
| **Creativity & Originality** | 20% | HITL workflow (approve/edit/refine), A/B content comparison with strategy variants, reasoning phase visualization, GPT Image generation, MCP Server integration, dual evaluation system (self-review + Foundry metrics) |
| **User Experience & Presentation** | 15% | Polished glassmorphism UI with animations, dark/light mode, 5-language i18n, bilingual mode (parallel + combined), skeleton loading, suggested questions, keyboard shortcuts, conversation history, content export (Markdown + JSON) |
| **Technical Implementation** | 15% | agent-framework-core SDK, SSE streaming with OTel distributed tracing, Cosmos DB persistence, Azure Container Apps deployment via azd, GitHub Actions CI/CD (lint → test → build → deploy → security scan), 123 unit tests, OpenTelemetry → Application Insights pipeline, Foundry Evaluation SDK integration |

## 🧪 Testing

```bash
# Run all 123 tests
uv run python -m pytest tests/ -q

# With verbose output
uv run python -m pytest tests/ -v

# With coverage
uv run python -m pytest tests/ --cov=src --cov-report=term-missing
```

## License

[MIT License](LICENSE)
