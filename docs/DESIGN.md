# DESIGN.md — アーキテクチャ設計書

## 1. システムアーキテクチャ

```
┌──────────────────────────────────────────────────────────────────┐
│     Frontend (React 19 + TypeScript 5 + Vite 7 + Tailwind v3)   │
│  🌐 i18n (EN/JA/KO/ZH/ES)  🌙 Dark/Light Mode  💬 Multi-turn  │
│  🧠 Reasoning Phase Badges  🔧 Tool Pills  📋 Copy / Export     │
│  👤 HITL (Approve/Edit/Refine)  🎯 A/B Compare  🖼️ Images      │
│  📊 Radar Chart  📈 Processing Metrics  💡 Suggested Questions   │
└───────────────────────────┬──────────────────────────────────────┘
                            │ REST API + SSE (Server-Sent Events)
                            │ __TOOL_EVENT__ / __REASONING_REPLACE__ markers
┌───────────────────────────▼──────────────────────────────────────┐
│                    Backend (FastAPI + uvicorn)                    │
│  POST /api/chat        — SSE Streaming Response                  │
│  POST /api/evaluate    — Foundry Evaluation (品質メトリクス)     │
│  GET  /api/health      — Health + Version + Observability        │
│  GET  /api/conversations     — 会話一覧                         │
│  GET  /api/conversations/{id} — 会話詳細                        │
│  DELETE /api/conversations/{id} — 会話削除                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │     Single Agent + 7 Tools (gpt-5.2 reasoning)            │  │
│  │                                                            │  │
│  │   System Prompt (3-Phase Reasoning Directives)             │  │
│  │     ├── CoT: 戦略立案の段階的思考                          │  │
│  │     ├── ReAct: ツール使用 + 推論の交互実行                 │  │
│  │     └── Self-Reflection: 品質自己評価・改善                │  │
│  │                                                            │  │
│  │   Hosted Tools:                                            │  │
│  │     ├── 🌐 web_search (Bing Grounding)                    │  │
│  │     ├── 📁 file_search (FileSearchTool → Vector Store)    │  │
│  │     └── 📘 mcp (Microsoft Learn Streamable HTTP)          │  │
│  │                                                            │  │
│  │   Custom Tools (@tool decorator):                          │  │
│  │     ├── 🔍 search_knowledge_base (Foundry IQ)             │  │
│  │     ├── ✏️  generate_content                               │  │
│  │     ├── 📋 review_content                                  │  │
│  │     └── 🖼️  generate_image (gpt-image-1.5)               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AzureOpenAIResponsesClient (Singleton)                 │    │
│  │  agent-framework-core (Responses API v1)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │ OpenTelemetry    │  │ Cosmos DB        │  │ Foundry      │   │
│  │ Distributed      │  │ 会話履歴         │  │ Evaluation   │   │
  │ Tracing          │  │ (Private EP)     │  │ (azure-ai-   │   │
  │ → App Insights   │  │ (ユーザー分離)     │  │  evaluation) │   │
  └─────────────────┘  └──────────────────┘  └──────────────┘   │
  ┌─────────────────┐                                                  │
  │ Key Vault        │  Secret management (RBAC + PE)               │
  │ (Private EP)     │  PROJECT_ENDPOINT, App Insights, etc.        │
  └─────────────────┘                                                  │
└──────────────────────────────────────────────────────────────────┘
               │              │              │              │
       ┌───────┘     ┌────────┘     ┌────────┘     ┌────────┘
       ▼              ▼              ▼              ▼
 ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
 │ Bing     │  │ Vector Store │  │ Azure AI │  │ Azure        │
 │ Grounding│  │ (Brand Guide)│  │ Search   │  │ Application  │
 │          │  │              │  │ (IQ)     │  │ Insights     │
 └──────────┘  └──────────────┘  └──────────┘  └──────────────┘
```

## 2. 単一エージェント + マルチツール設計

### 設計思想

**`agent-framework-core` SDK の `AzureOpenAIResponsesClient` + `@tool` デコレータを使用。**

利点:

- `@tool(approval_mode="never_require")` + `Annotated` で型安全なツール定義
- `client.as_agent()` → `agent.run(query, stream=True)` のシンプルなストリーミング
- LLM が全コンテキストを保持したまま一貫した判断
- エージェント間のデータ受け渡しオーバーヘッドなし
- 推論プロセス（thinking）がフロントエンドで一元表示可能
- OpenTelemetry で完全な分散トレーシング

### エージェント処理フロー

```
  User Message (topic, platforms, content_type, language, reasoning_effort)
      │
      ▼
  ┌─ Agent (gpt-5.2 reasoning) ──────────────────────────────────┐
  │                                                               │
  │  🧠 Phase 1: Strategic Analysis (CoT)                        │
  │      ├── トピック分析 → 段階的思考                             │
  │      ├── reasoning tokens をフロントへストリーム                │
  │      └── UI: 💭 Indigo badge (pulsing)                       │
  │                                                               │
  │  ⚡ Phase 2: Content Creation (ReAct)                         │
  │      ├── 🌐 web_search("latest trends...")                    │
  │      ├── 📁 file_search("brand guidelines")                  │
  │      ├── 📘 mcp.microsoft_docs_search("topic...")             │
  │      ├── 🔍 search_knowledge_base("query...")                 │
  │      ├── ✏️  generate_content(strategy, per platform)         │
  │      ├── 🖼️  generate_image(prompt, platform, style)         │
  │      ├── 各ツール呼び出しで OTel span を生成                   │
  │      └── UI: ⚡ Amber badge (pulsing) + Tool pills            │
  │                                                               │
  │  🔍 Phase 3: Quality Review (Self-Reflection)                │
  │      ├── 5軸品質自己評価・スコア < 7 なら改善                  │
  │      ├── 📋 review_content(draft, guidelines)                 │
  │      └── UI: 🔍 Emerald badge (pulsing)                      │
  │                                                               │
  │  📤 Final Output: Structured JSON                             │
  │      ├── contents[]: platform, body, hashtags, CTA, image     │
  │      ├── review: scores (5-axis), feedback, improvements      │
  │      └── sources_used: Web/MCP で参照した URL リスト           │
  └───────────────────────────────────────────────────────────────┘
```

### ツール一覧（7ツール）

| ツール名 | 種別 | 説明 |
|----------|------|------|
| `web_search` | Hosted (Bing Grounding) | リアルタイムのトレンド・ニュース検索 |
| `file_search` | Hosted (FileSearchTool) | ブランドガイドライン検索（Vector Store） |
| `mcp` | Hosted (MCP Server) | Microsoft Learn ドキュメント検索 (Streamable HTTP: `https://learn.microsoft.com/api/mcp`) |
| `search_knowledge_base` | Custom (@tool) | Foundry IQ Agentic Retrieval（Azure AI Search 経由の深い文書検索） |
| `generate_content` | Custom (@tool) | プラットフォーム別の文字数制約・フォーマット最適化を適用してコンテンツ生成 |
| `review_content` | Custom (@tool) | 5軸品質スコアリング（brand_alignment, audience_relevance, engagement_potential, clarity, platform_optimization）+ 改善提案 |
| `generate_image` | Custom (@tool) | gpt-image-1.5 でプラットフォーム最適化されたビジュアルを生成。base64 でフロントエンドに返却 |

## 3. Human-in-the-Loop (HITL) ワークフロー

生成されたコンテンツに対して、プラットフォームごとに以下のアクションが可能：

1. **✅ 承認 (Approve)** — コンテンツを確認済みとしてマーク（視覚的な承認スタンプ）
2. **✏️ 編集 (Edit)** — インライン テキスト編集（textarea で直接修正、保存/キャンセル）
3. **🔄 改善 (Refine)** — 自然言語でフィードバックを入力 → AI エージェントに再送信

Refine は同じ会話スレッドにフォローアップメッセージを送信し、指定プラットフォームのコンテンツのみを改善。
会話コンテキストが保持されるため、トピックや他プラットフォームの内容は維持される。

## 4. A/B コンテンツ比較

AI Settings パネルの A/B モードをトグルすると、**2つのコンテンツバリアントを異なる戦略で生成**：

- システムプロンプトに A/B addendum が追加される
- JSON スキーマ: `{mode: "ab", variant_a: {strategy, contents, review}, variant_b: {strategy, contents, review}, sources_used}`
- フロントエンドで `ABCompareCards` としてサイドバイサイド比較カードを表示
- 各バリアントにミニレーダーチャート + 勝者バッジ
- 選択したバリアントを展開して全 HITL/エクスポート機能を利用可能

## 5. コンテンツエクスポート

- **📥 Markdown (.md)** — 全プラットフォームのコンテンツ + ハッシュタグ + CTA + 品質スコア + ソースを構造化
- **📥 JSON** — 構造化出力をそのまま JSON としてダウンロード（CMS 連携やツール統合用）

## 6. データモデル

### 6.1 ChatRequest（API リクエスト）

```json
{
  "message": "string (ユーザー入力テキスト)",
  "thread_id": "string | null (マルチターン用、初回は null)",
  "conversation_id": "string | null (Cosmos DB 会話 ID)",
  "platforms": ["linkedin", "x", "instagram"],
  "content_type": "product_launch | thought_leadership | event_promotion | event_recap | company_culture | tech_insight | news_commentary | tutorial_howto | case_study | behind_the_scenes | announcement | data_insight | personal_branding | recruitment | seasonal | custom",
  "language": "en | ja | ko | zh | es",
  "reasoning_effort": "low | medium | high",
  "reasoning_summary": "off | auto | concise | detailed",
  "ab_mode": false,
  "bilingual": false,
  "bilingual_style": "parallel | combined"
}
```

### 6.2 SSE ストリームイベント

```
# 推論トークン（累積置き換え方式）
__REASONING_REPLACE__思考内容...__END_REASONING_REPLACE__

# ツール呼び出し開始
__TOOL_EVENT__{"type":"tool_start","tool":"web_search","input":{...}}__END_TOOL_EVENT__

# ツール結果
__TOOL_EVENT__{"type":"tool_end","tool":"web_search","duration_ms":1200}__END_TOOL_EVENT__

# テキストストリーム（OpenAI SSE 形式）
data: {"choices":[{"delta":{"content":"..."}}],"thread_id":"...","conversation_id":"..."}

# 完了
data: {"type":"done","thread_id":"...","conversation_id":"..."}

# エラー
data: {"type":"error","message":"Rate limit exceeded","retry_after":5}
```

### 6.3 ContentOutput（最終出力 JSON）

```json
{
  "contents": [
    {
      "platform": "linkedin | x | instagram",
      "body": "string (マークダウン対応)",
      "hashtags": ["string"],
      "call_to_action": "string",
      "character_count": "number",
      "posting_time_suggestion": "string",
      "image": "string (base64, optional)"
    }
  ],
  "review": {
    "overall_score": "number (1-10)",
    "scores": {
      "brand_alignment": "number (1-10)",
      "audience_relevance": "number (1-10)",
      "engagement_potential": "number (1-10)",
      "clarity": "number (1-10)",
      "platform_optimization": "number (1-10)"
    },
    "feedback": ["string"],
    "improvements_made": ["string"]
  },
  "sources_used": ["string (Web/MCP で参照した URL 等)"]
}
```

### 6.4 A/B モード出力

```json
{
  "mode": "ab",
  "variant_a": {
    "strategy": "string",
    "contents": [/* ContentOutput.contents と同じ */],
    "review": {/* ContentOutput.review と同じ */}
  },
  "variant_b": {
    "strategy": "string",
    "contents": [...],
    "review": {...}
  },
  "sources_used": ["string"]
}
```

## 7. 推論パターン設計（単一プロンプトに統合）

gpt-5.2 の推論能力を活用し、**1つのシステムプロンプト内に 3つの推論パターンを組み込む。**

| フェーズ | パターン | 目的 | UIインジケータ |
|---------|---------|------|---------------|
| Phase 1 | **Chain-of-Thought (CoT)** | 戦略分析 — トピック分解、ターゲットオーディエンス特定、キーメッセージ計画 | 💭 Indigo badge (pulsing) |
| Phase 2 | **ReAct (Reasoning + Acting)** | コンテンツ作成 — ツール使用 + 推論の交互実行 | ⚡ Amber badge (pulsing) |
| Phase 3 | **Self-Reflection** | 品質レビュー — 5軸自己評価、スコア < 7 なら改善 | 🔍 Emerald badge (pulsing) |

### 推論制御パラメータ

ユーザは AI Settings パネルから以下を制御可能:

- **Reasoning Effort**: `low` / `medium` / `high` — 推論の深さ
- **Reasoning Summary**: `off` / `auto` / `concise` / `detailed` — thinking 表示レベル
- `default_options={"reasoning": {"effort": effort, "summary": summary}}`

## 8. Observability（可観測性）

### 8.1 OpenTelemetry + Azure Application Insights

```python
# src/telemetry.py — FastAPI import 前に呼び出し
from src.telemetry import setup_telemetry
setup_telemetry()

# 自動計装:
# - FastAPI/Starlette HTTP リクエスト
# - Azure SDK HTTP 呼び出し
# - agent-framework-core の enable_instrumentation()
```

#### パイプラインスパン構造

```
pipeline.social_content (root span)
├── attributes: reasoning.effort, platforms, content_type, language
├── tool.web_search (child span)
│   └── attributes: duration_ms
├── tool.file_search (child span)
│   └── attributes: duration_ms
├── tool.mcp (child span)
│   └── attributes: duration_ms
├── tool.generate_content (child span)
│   └── attributes: duration_ms
├── tool.generate_image (child span)
│   └── attributes: duration_ms
└── tool.review_content (child span)
    └── attributes: duration_ms
```

#### データフロー

```
Agent (OTel Spans) → Azure Monitor Exporter → Application Insights
                                                    ↓
                          ┌─────────────────────────┴──────────────────┐
                          │ Application Map | Live Metrics | Traces    │
                          │ End-to-end Transaction View                │
                          │ Microsoft Foundry → Observability → Traces │
                          └────────────────────────────────────────────┘
```

### 8.2 Foundry Evaluation (azure-ai-evaluation SDK)

```python
# POST /api/evaluate — 生成コンテンツの品質評価
from src.evaluation import evaluate_content

scores = await evaluate_content(
    query="AI trends 2026",
    response="Generated content...",
    context="Brand guidelines..."
)
# → {"relevance": 4.5, "coherence": 5.0, "fluency": 4.0, "groundedness": 4.5}
```

| メトリクス | スケール | 測定内容 |
|-----------|---------|---------|
| **Relevance** | 1-5 | トピックへの適合度 |
| **Coherence** | 1-5 | 論理的構成 |
| **Fluency** | 1-5 | 自然な言語表現 |
| **Groundedness** | 1-5 | コンテキストへの根拠 |

エージェントの5軸自己レビュー (1-10) + Foundry Evaluation (1-5) の **二重評価システム**。

## 9. Cosmos DB 会話履歴

- `src/database.py` で Cosmos DB 統合
- パーティションキー: `/userId`（将来のマルチテナント対応）
- サーバーレスモード（オンデマンド課金、スループット自動スケーリング）
- Cosmos DB 未設定時はインメモリ辞書にフォールバック
- REST API: CRUD 操作 (`GET /api/conversations`, `GET /api/conversations/{id}`, `DELETE /api/conversations/{id}`)
- メッセージ保存: ユーザーメッセージ + アシスタントレスポンス + ツールイベント

## 10. Foundry IQ Agentic Retrieval

- `src/agentic_retrieval.py` で Azure AI Search Agentic Retrieval API を統合
- API バージョン: `2025-11-01-preview`
- ReasoningEffort 3段階: MINIMAL（intents 方式）, LOW/MEDIUM（messages 方式）
- `@tool` デコレータで `search_knowledge_base` としてエージェントのツールに自動登録
- `AI_SEARCH_ENDPOINT` 未設定時は自動スキップ（ツール一覧に含まれない）

## 11. 画像生成

- `src/tools.py` の `generate_image` カスタムツール
- **Responses API** の `image_generation` ツールタイプを使用（`client.responses.create()` + `tools=[{"type": "image_generation"}]`）
- `openai.OpenAI` クライアントを `RESPONSES_API_BASE_URL` で初期化、`DefaultAzureCredential` でトークン取得
- パラメータ: `prompt`, `platform`, `style`
- プラットフォーム別サイズ: LinkedIn (1024x1024), X (1024x1024), Instagram (1024x1024)
- base64 エンコードで `ContextVar` サイドチャネル経由でフロントエンドに配信（LLM コンテキストには返さない）
- フロントエンドの ContentCards で `data:image/png;base64,...` として表示

## 12. ディレクトリ構造

```
hackfest-techconnect2026/
├── .github/
│   ├── copilot-instructions.md
│   ├── instructions/
│   │   ├── python-foundry.instructions.md
│   │   └── security.instructions.md
│   └── workflows/
│       ├── ci.yml               # CI: Ruff lint + pytest + フロント tsc & build
│       ├── deploy.yml           # Deploy: ACR ビルド → Container App 更新
│       └── security.yml         # Security: Trivy + Gitleaks + 依存監査
├── src/
│   ├── __init__.py
│   ├── config.py              # 環境設定 (dotenv)
│   ├── client.py              # AzureOpenAIResponsesClient シングルトン
│   ├── agent.py               # エージェント作成・SSE ストリーミング・OTel トレーシング
│   ├── tools.py               # カスタムツール (generate_content, review_content, generate_image)
│   ├── vector_store.py        # Vector Store 自動作成 + FileSearchTool
│   ├── database.py            # Cosmos DB 会話履歴 (InMemory フォールバック)
│   ├── agentic_retrieval.py   # Foundry IQ Agentic Retrieval
│   ├── telemetry.py           # OpenTelemetry + Azure Monitor セットアップ
│   ├── evaluation.py          # Foundry Evaluation (azure-ai-evaluation)
│   ├── models.py              # Pydantic データモデル
│   ├── prompts/
│   │   ├── __init__.py
│   │   └── system_prompt.py   # 3フェーズ推論プロンプト (CoT + ReAct + Self-Reflection)
│   └── api.py                 # FastAPI エンドポイント (SSE + Evaluation + Static)
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # メインアプリ (HITL + Retry + Timer + History)
│   │   ├── components/
│   │   │   ├── InputForm.tsx      # トピック入力 + AI Settings パネル
│   │   │   ├── ContentCards.tsx   # プラットフォームカード + HITL + Export
│   │   │   ├── ContentDisplay.tsx # JSON → Cards パーサー + Skeleton
│   │   │   ├── ReasoningPanel.tsx # 推論表示 + Phase Badge
│   │   │   ├── ToolEvents.tsx     # ツール使用 Pills (アニメーション)
│   │   │   ├── ABCompareCards.tsx # A/B 比較カード
│   │   │   ├── HistorySidebar.tsx # 会話履歴サイドバー
│   │   │   ├── SuggestedQuestions.tsx
│   │   │   └── Header.tsx
│   │   ├── hooks/
│   │   │   ├── useTheme.ts       # テーマ管理
│   │   │   └── useI18n.ts        # i18n フック
│   │   └── lib/
│   │       ├── api.ts             # SSE クライアント
│   │       └── i18n.ts            # 翻訳データ (EN/JA/KO/ZH/ES)
│   ├── vite.config.ts
│   └── package.json
├── tests/                     # 123 ユニットテスト (pytest + pytest-asyncio)
├── infra/
│   ├── main.bicep             # Azure インフラ (ACR + Container Apps)
│   └── main.parameters.json
├── data/
│   └── brand_guidelines.md    # ブランドガイドライン (Vector Store にアップロード)
├── docs/
│   ├── ARCHITECTURE.md    # Azure アーキテクチャ（リソース一覧・Mermaid 図）
│   ├── DESIGN.md              # 本ドキュメント
│   └── SPEC.md                # エージェント仕様書
├── Dockerfile                 # マルチステージビルド (Node frontend + Python backend)
├── azure.yaml                 # Azure Developer CLI プロジェクト設定
├── pyproject.toml
├── .env.example
└── README.md
```

## 13. フロントエンド設計

### コンポーネント一覧

| コンポーネント | 役割 | SSE イベント |
|---|---|---|
| `App.tsx` | レイアウト、テーマ・i18n コンテキスト、HITL + Retry + Timer | — |
| `Header.tsx` | ヘッダー (グラディエント) + テーマ/言語切替 | — |
| `InputForm.tsx` | トピック入力 + プラットフォーム選択 + AI Settings (推論制御 + A/B トグル) | — |
| `ContentDisplay.tsx` | 構造化 JSON パーサー → ContentCards / ABCompareCards + Skeleton | `text` |
| `ContentCards.tsx` | プラットフォームカード + HITL (Approve/Edit/Refine) + Export + Radar Chart | — |
| `ABCompareCards.tsx` | A/B バリアント比較 (サイドバイサイド + ミニレーダー + 勝者バッジ) | — |
| `ReasoningPanel.tsx` | 折りたたみ推論パネル + Phase Badges (CoT/ReAct/Self-Reflection) | `reasoning` |
| `ToolEvents.tsx` | ツール使用 Pills (アニメーション + グラデーションピル + 所要時間) | `tool_start` / `tool_end` |
| `HistorySidebar.tsx` | 会話履歴サイドバー (Cosmos DB 連携) | — |
| `SuggestedQuestions.tsx` | 空状態の提案質問グリッド (4つのクリック可能サンプル) | — |

### UIデザインシステム

- **Glassmorphism**: frosted glass cards (`backdrop-blur-xl`), `bg-white/70 dark:bg-gray-800/70`
- **Gradient Design**: ヘッダ・サブミットボタン・ボーダーにグラディエント
- **Animated Tool Pills**: グロー効果 + パルスアニメーション (`animate-pulse-glow`)
- **Skeleton Loading**: shimmer プレースホルダー (生成中)
- **Card Animations**: staggered fade-in (`animationDelay` で順次表示)
- **Dark / Light Mode**: `dark:` Tailwind クラスで全コンポーネント対応

## 14. CI/CD パイプライン（GitHub Actions）

### ワークフロー一覧

| ワークフロー | ファイル | トリガー | ジョブ |
|---|---|---|---|
| **CI** | `ci.yml` | push / PR to main | Ruff lint → pytest (123 tests) → Frontend tsc + build |
| **Deploy** | `deploy.yml` | push to main (CI 通過後) | ACR ビルド → Container App 更新 → ヘルスチェック |
| **Security** | `security.yml` | push / PR / 毎週月曜 | Trivy スキャン → Gitleaks → 依存関係監査 |

### パイプラインフロー

```
git push (main)
    │
    ├──→ ci.yml
    │     ├── 🔍 Ruff lint (check + format)
    │     ├── 🧪 pytest (123 tests)
    │     └── 🎨 Frontend tsc --noEmit + build
    │
    ├──→ deploy.yml (ci.yml 通過後)
    │     ├── 🔐 Azure Login (OIDC)
    │     ├── 🐳 az acr build (SHA + latest タグ)
    │     ├── 🚀 az containerapp update
    │     └── ✅ Health check (/api/health, 5 回リトライ)
    │
    └──→ security.yml
          ├── 🛡️ Trivy (filesystem scan → SARIF)
          ├── 🔐 Gitleaks (secret detection)
          └── 📦 npm audit + pip-audit
```

### 認証（OIDC Workload Identity Federation）

- Azure AD App Registration + サービスプリンシパル
- Federated Credential: `repo:naoki1213mj/social-ai-studio:ref:refs/heads/main` + `environment:production`
- ロール: `AcrPush` (ACR) + `Contributor` (Container App)
- GitHub Variables: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`

## 15. Azure デプロイメント

### Docker マルチステージビルド

```
Stage 1 (node:22-slim): npm install → npm run build → frontend/dist
Stage 2 (python:3.12-slim): uv sync → COPY frontend/dist → uvicorn
```

backend で `SERVE_STATIC=true` を設定すると、`frontend/dist` を FastAPI から直接配信。

### Azure Container Apps (azd)

```bash
azd auth login
azd up
```

- `azure.yaml` で `host: containerapp` を定義
- `infra/main.bicep` で ACR + Log Analytics + Container Apps Environment + Container App を一括プロビジョニング
- SystemAssigned マネージド ID で Microsoft Foundry に認証
- Application Insights への接続文字列は環境変数で設定

## 16. 依存パッケージ

### Python (Backend)

```
agent-framework-core           # Agent Framework SDK (Responses API v1)
azure-identity                 # DefaultAzureCredential 認証
azure-cosmos                   # Cosmos DB 会話履歴
azure-monitor-opentelemetry    # Azure Monitor (Application Insights)
azure-core-tracing-opentelemetry  # Azure SDK OTel 統合
azure-ai-evaluation            # Foundry Evaluation (品質メトリクス)
opentelemetry-sdk              # OpenTelemetry SDK
httpx                          # Foundry IQ HTTP client
python-dotenv                  # 環境変数
```

### Node.js (Frontend)

```
react 19                # UI フレームワーク
typescript 5            # 型安全
tailwindcss 3           # スタイリング + dark mode
react-markdown          # Markdown レンダリング
recharts                # レーダーチャート
lucide-react            # アイコン
vite 7                  # ビルドツール
```
