# Azure Architecture — Social AI Studio

> **Last updated**: 2026-03-09 (VNet + Key Vault + Private Endpoints)

## Overview

Social AI Studio runs on **Azure Container Apps** with **VNet integration** as a single-container deployment (multi-stage Docker: React frontend + Python backend). The agent leverages Microsoft Foundry's Responses API for reasoning (gpt-5.2) and image generation (gpt-image-1.5). All backend services (Cosmos DB, Key Vault) are accessed via **Private Endpoints** within the VNet. Secrets are managed centrally in **Azure Key Vault**.

## Architecture Diagram

```mermaid
graph TB
    subgraph User["User / Browser"]
        Browser["🌐 Browser<br/>React 19 SPA"]
    end

    subgraph GitHub["GitHub"]
        Repo["📦 Repository<br/>naoki1213mj/social-ai-studio"]
        Actions["⚙️ GitHub Actions<br/>CI / Deploy / Security"]
    end

    subgraph Azure["Azure (East US 2)"]
        subgraph RG["Resource Group: rg-hackfest-techconnect2026"]

            subgraph Network["Virtual Network (10.0.0.0/16)"]
                subgraph CASubnet["snet-container-apps (10.0.0.0/23)"]
                    CAE["Container Apps Environment<br/>cae-techpulse-prod<br/>(VNet-integrated)"]
                    CA["🐳 Container App<br/>ca-techpulse-prod<br/>FastAPI + React SPA<br/>System Managed Identity"]
                end

                subgraph PESubnet["snet-private-endpoints (10.0.2.0/24)"]
                    PECosmos["🔒 PE: Cosmos DB"]
                    PEKV["🔒 PE: Key Vault"]
                end
            end

            subgraph Security["Security & Secrets"]
                KV["🔑 Key Vault<br/>kv-techpulse-prod<br/>RBAC + Private Endpoint"]
            end

            subgraph Registry["Container Registry"]
                ACR["📦 ACR<br/>crtechpulseprod<br/>social-ai-studio:latest"]
            end

            subgraph AI["AI Services"]
                Foundry["🧠 AI Foundry<br/>foundry-hackfest-techconnect2026-eastus2-001"]
                Project["📂 AI Project<br/>proj-hackfest2026"]
                GPT52["gpt-5.2<br/>Reasoning Agent"]
                GPTImg["gpt-image-1.5<br/>Image Generation"]
                Bing["🔍 Bing Grounding<br/>bingsrch-hackefest-techconnect2026"]
                ContentSafety["🛡️ Content Safety<br/>cs-content-safety-prod"]
            end

            subgraph Data["Data & Persistence"]
                Cosmos["💾 Cosmos DB<br/>cosmos-social-ai-studio<br/>Private Endpoint only"]
                VectorStore["📁 Vector Store<br/>(Foundry-managed)"]
                AISearch["🔍 Azure AI Search<br/>search-social-ai-studio"]
            end

            subgraph Observability["Observability"]
                AppInsights["📊 Application Insights<br/>appi-social-ai-studio"]
                LogAnalytics["📋 Log Analytics<br/>log-techpulse-prod"]
            end

            subgraph DNS["Private DNS Zones"]
                DNSCosmos["privatelink.documents.azure.com"]
                DNSKV["privatelink.vaultcore.azure.net"]
            end
        end
    end

    subgraph External["External Services"]
        MCP["📘 MCP Server<br/>learn.microsoft.com/api/mcp"]
    end

    Browser -->|HTTPS| CA
    Repo -->|push| Actions
    Actions -->|az acr build| ACR
    Actions -->|az containerapp update| CA
    ACR -->|pull image| CA
    CA -->|Managed Identity| KV
    KV -.->|secrets| CA
    CA -->|Responses API<br/>DefaultAzureCredential| Foundry
    Foundry --> Project
    Project --> GPT52
    Project --> GPTImg
    CA -->|Web Search tool| Bing
    CA -->|File Search tool| VectorStore
    CA -->|Agentic Retrieval| AISearch
    CA -->|MCP tool| MCP
    CA -->|Text Analysis| ContentSafety
    CA -->|Private Endpoint| PECosmos
    PECosmos -->|CRUD| Cosmos
    CA -->|Private Endpoint| PEKV
    PEKV --> KV
    CA -->|OTel traces| AppInsights
    AppInsights --> LogAnalytics
    DNSCosmos -.->|resolves| PECosmos
    DNSKV -.->|resolves| PEKV
```

## Resource Inventory

| Resource | Type | Name | Purpose |
|----------|------|------|---------|
| **AI Foundry** | `CognitiveServices/accounts` | `foundry-hackfest-techconnect2026-eastus2-001` | AI Services account (hosts model deployments) |
| **AI Project** | `CognitiveServices/accounts/projects` | `proj-hackfest2026` | Foundry project (Responses API endpoint, agent tools) |
| **Bing Grounding** | `Bing/accounts` | `bingsrch-hackefest-techconnect2026` | Web search tool for real-time trend research |
| **Container Registry** | `ContainerRegistry/registries` | `crtechpulseprod` | Docker image registry (Basic SKU) |
| **Virtual Network** | `Network/virtualNetworks` | `vnet-techpulse-prod` | Network isolation (10.0.0.0/16) |
| **Container Apps Env** | `App/managedEnvironments` | `cae-techpulse-prod` | Managed environment (VNet-integrated) |
| **Container App** | `App/containerApps` | `ca-techpulse-prod` | Application host (System Managed Identity) |
| **Key Vault** | `KeyVault/vaults` | `kv-techpulse-prod` | Secret management (RBAC, Private Endpoint) |
| **Cosmos DB** | `DocumentDB/databaseAccounts` | `cosmos-social-ai-studio` | Conversation history (Private Endpoint) |
| **Application Insights** | `Insights/components` | `appi-social-ai-studio` | Distributed tracing + metrics |
| **Log Analytics** | `OperationalInsights/workspaces` | `log-techpulse-prod` | Log aggregation |
| **Azure AI Search** | `Search/searchServices` | `search-social-ai-studio` | Agentic Retrieval (Foundry IQ) |
| **Content Safety** | `CognitiveServices/accounts` | `cs-content-safety-prod` | Text moderation + prompt shield |
| **Private Endpoint** | `Network/privateEndpoints` | `pe-cosmos-social-ai-studio` | Cosmos DB private access |
| **Private Endpoint** | `Network/privateEndpoints` | `pe-kv-techpulse-prod` | Key Vault private access |
| **Private DNS Zone** | `Network/privateDnsZones` | `privatelink.documents.azure.com` | Cosmos DB private DNS |
| **Private DNS Zone** | `Network/privateDnsZones` | `privatelink.vaultcore.azure.net` | Key Vault private DNS |

## Model Deployments

| Model | Deployment Name | Purpose |
|-------|----------------|---------|
| **gpt-5.2** | `gpt-5.2` | Reasoning agent (CoT → ReAct → Self-Reflection) |
| **gpt-image-1.5** | `gpt-image-1.5` | Social media visual generation |

## Networking & Authentication

| Aspect | Configuration |
|--------|--------------|
| **VNet** | `vnet-techpulse-prod` (10.0.0.0/16) |
| **Container Apps Subnet** | `snet-container-apps` (10.0.0.0/23, delegated) |
| **Private Endpoints Subnet** | `snet-private-endpoints` (10.0.2.0/24) |
| **Cosmos DB access** | Private Endpoint only (`publicNetworkAccess: Disabled`) |
| **Key Vault access** | Private Endpoint only (`publicNetworkAccess: Disabled`) |
| **Ingress** | HTTPS (TLS auto-managed by Container Apps, external) |
| **App URL** | `https://ca-techpulse-prod.<env-suffix>.eastus2.azurecontainerapps.io/` |
| **Auth (app → AI)** | `DefaultAzureCredential` (System Managed Identity) |
| **Auth (app → Key Vault)** | RBAC: Key Vault Secrets User role |
| **Auth (app → Cosmos DB)** | RBAC: Cosmos DB Built-in Data Contributor |
| **Secret management** | Azure Key Vault (PROJECT_ENDPOINT, App Insights, Content Safety) |
| **Token audience** | `https://ai.azure.com/.default` |
| **Container pull** | ACR admin credentials (Container App ↔ ACR) |

## CI/CD Pipeline

```mermaid
graph LR
    A["git push<br/>(main)"] --> B["ci.yml<br/>Lint + Test"]
    B -->|pass| C["deploy.yml<br/>Build & Push"]
    C --> D["ACR Build<br/>Docker multi-stage"]
    D --> E["Container App<br/>Update revision"]
    E --> F["Health Check<br/>/api/health"]
    A --> G["security.yml<br/>Trivy + Gitleaks"]
```

| Workflow | Trigger | Jobs |
|----------|---------|------|
| **CI (ci.yml)** | push / PR to main | Ruff lint → pytest (123 tests) → Frontend tsc + build |
| **Deploy (deploy.yml)** | push to main (after CI) | ACR build → Container App update → health check |
| **Security (security.yml)** | push / PR / weekly | Trivy scan → Gitleaks secret detection → dependency audit |

### GitHub Variables Required

| Variable | Description |
|----------|-------------|
| `AZURE_CLIENT_ID` | Service principal or managed identity client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

## Deployment

### Automated (recommended)

```bash
git push origin main
# → GitHub Actions: lint → test → build → deploy → health check
```

### Manual

```bash
# Build & push image
az acr build --registry crtechpulseprod \
  --image social-ai-studio:latest \
  --file Dockerfile .

# Update Container App
az containerapp update \
  -g rg-hackfest-techconnect2026 \
  -n ca-techpulse-prod \
  --image crtechpulseprod.azurecr.io/social-ai-studio:latest
```

### First-time setup (azd)

```bash
azd auth login
azd up
```

## Data Flow

```
User Input → Content Safety (Prompt Shield)
           → gpt-5.2 Agent (Responses API)
              ├── Web Search (Bing Grounding) → real-time trends
              ├── File Search (Vector Store) → brand guidelines
              ├── MCP Server → Microsoft Learn docs
              ├── Foundry IQ (Azure AI Search) → deep document search
              ├── generate_content → platform-specific text
              ├── review_content → 5-axis quality scoring
              └── generate_image (gpt-image-1.5) → visuals
           → Content Safety (Text Analysis)
           → SSE Stream → Browser
           → Cosmos DB (save conversation)
           → App Insights (OTel traces)
```

## Cost Considerations

| Resource | SKU / Tier | Billing Model |
|----------|-----------|---------------|
| Container Apps | Consumption | Pay-per-use (vCPU-seconds + memory) |
| ACR | Basic | Fixed monthly |
| Cosmos DB | Serverless | Per-RU consumed |
| AI Foundry / gpt-5.2 | Global Standard | Per 1K tokens |
| gpt-image-1.5 | Standard | Per image |
| Bing Search | S1 | Per 1K transactions |
| AI Search | Basic | Fixed monthly |
| Content Safety | S0 | Per 1K transactions |
| Application Insights | Pay-as-you-go | Per GB ingested |
