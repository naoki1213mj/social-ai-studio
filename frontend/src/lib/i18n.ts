/** i18n translation data */
export type Locale = "en" | "ja";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "app.title": "TechPulse Social",
    "app.subtitle": "AI-Powered Social Media Content Studio",
    "app.description": "Generate high-quality social media content with reasoning AI",

    // Input
    "input.topic": "Topic / Theme",
    "input.topic.placeholder": "e.g., Launch of the new AI code assistant feature...",
    "input.platforms": "Platforms",
    "input.contentType": "Content Type",
    "input.language": "Output Language",
    "input.submit": "Generate Content",
    "input.generating": "Generating...",
    "input.stop": "Stop Generation",

    // Status
    "status.complete": "Complete",
    "action.newConversation": "New Conversation",

    // HITL
    "hitl.approve": "Approve",
    "hitl.approved": "Approved",
    "hitl.edit": "Edit",
    "hitl.refine": "Refine",
    "hitl.refine.placeholder": "Describe how to improve this content...",
    "hitl.send": "Send Feedback",
    "hitl.cancel": "Cancel",
    "hitl.save": "Save",

    // Export
    "export.markdown": "Export .md",
    "export.json": "Export JSON",

    // Error
    "error.generic": "An error occurred. Please try again.",
    "error.retry": "Retry",
    "platforms.linkedin": "LinkedIn",
    "platforms.x": "X (Twitter)",
    "platforms.instagram": "Instagram",

    // Content Types
    "contentType.product_launch": "Product Launch",
    "contentType.thought_leadership": "Thought Leadership",
    "contentType.event_promotion": "Event Promotion",
    "contentType.company_culture": "Company Culture",
    "contentType.tech_insight": "Tech Insight",

    // Language
    "language.en": "English",
    "language.ja": "Japanese",

    // Settings
    "settings.title": "AI Settings",
    "settings.reasoningEffort": "Reasoning Depth",
    "settings.reasoningEffort.low": "Low — Fast, simple",
    "settings.reasoningEffort.medium": "Medium — Balanced",
    "settings.reasoningEffort.high": "High — Deep reasoning",
    "settings.reasoningSummary": "Thinking Display",
    "settings.reasoningSummary.off": "Off — Hide thinking",
    "settings.reasoningSummary.auto": "Auto",
    "settings.reasoningSummary.concise": "Concise",
    "settings.reasoningSummary.detailed": "Detailed",

    // Reasoning
    "reasoning.title": "Reasoning Process",
    "reasoning.thinking": "Thinking...",
    "reasoning.complete": "Reasoning complete",

    // Tools
    "tools.title": "Tool Usage",
    "tools.running": "tools running",
    "tools.used": "tools used",
    "tools.started": "Running",
    "tools.completed": "Completed",
    "tools.category.search": "Search",
    "tools.category.content": "Content",
    "tools.category.review": "Review",
    "tools.category.image": "Image",

    // Content
    "content.copy": "Copy",
    "content.copied": "Copied!",
    "content.chars": "characters",
    "content.title": "Generated Content",
    "content.sources": "Sources",
    "review.title": "Quality Review",
    "review.brandAlignment": "Brand Alignment",
    "review.audienceRelevance": "Audience Relevance",
    "review.engagementPotential": "Engagement Potential",
    "review.clarity": "Clarity",
    "review.platformOptimization": "Platform Optimization",
    "review.feedback": "Feedback",

    // Theme / i18n
    "theme.light": "Light",
    "theme.dark": "Dark",

    // Suggestions
    "suggestions.title": "Try these examples",
    "suggestions.1": "AI code assistant launch announcement",
    "suggestions.2": "Tech conference participation report",
    "suggestions.3": "Engineering team culture spotlight",
    "suggestions.4": "Latest AI trends and industry insights",

    // Footer area
    "footer.processing": "Processing",
    "footer.details": "Processing Details",
    "footer.reasoning": "Reasoning",
  },
  ja: {
    "app.title": "TechPulse Social",
    "app.subtitle": "AI搭載ソーシャルメディアコンテンツスタジオ",
    "app.description": "推論AIで高品質なSNSコンテンツを生成",

    // Input
    "input.topic": "トピック / テーマ",
    "input.topic.placeholder": "例: 新しいAIコードアシスタント機能のローンチ...",
    "input.platforms": "プラットフォーム",
    "input.contentType": "コンテンツタイプ",
    "input.language": "出力言語",
    "input.submit": "コンテンツ生成",
    "input.generating": "生成中...",
    "input.stop": "生成を停止",

    // Status
    "status.complete": "完了",
    "action.newConversation": "新しい会話",

    // HITL
    "hitl.approve": "承認",
    "hitl.approved": "承認済み",
    "hitl.edit": "編集",
    "hitl.refine": "改善",
    "hitl.refine.placeholder": "改善ポイントを入力してください...",
    "hitl.send": "フィードバック送信",
    "hitl.cancel": "キャンセル",
    "hitl.save": "保存",

    // Export
    "export.markdown": "Markdown出力",
    "export.json": "JSON出力",

    // Error
    "error.generic": "エラーが発生しました。もう一度お試しください。",
    "error.retry": "リトライ",
    "platforms.linkedin": "LinkedIn",
    "platforms.x": "X (Twitter)",
    "platforms.instagram": "Instagram",

    // Content Types
    "contentType.product_launch": "製品ローンチ",
    "contentType.thought_leadership": "ソートリーダーシップ",
    "contentType.event_promotion": "イベントプロモーション",
    "contentType.company_culture": "企業カルチャー",
    "contentType.tech_insight": "テックインサイト",

    // Language
    "language.en": "English",
    "language.ja": "日本語",

    // Settings
    "settings.title": "AI 設定",
    "settings.reasoningEffort": "推論深度",
    "settings.reasoningEffort.low": "Low — 高速・シンプル",
    "settings.reasoningEffort.medium": "Medium — バランス型",
    "settings.reasoningEffort.high": "High — 深い推論",
    "settings.reasoningSummary": "思考プロセス表示",
    "settings.reasoningSummary.off": "Off — 非表示",
    "settings.reasoningSummary.auto": "Auto — 自動",
    "settings.reasoningSummary.concise": "Concise — 簡潔",
    "settings.reasoningSummary.detailed": "Detailed — 詳細",

    // Reasoning
    "reasoning.title": "推論プロセス",
    "reasoning.thinking": "思考中...",
    "reasoning.complete": "推論完了",

    // Tools
    "tools.title": "ツール使用状況",
    "tools.running": "個のツールを実行中",
    "tools.used": "個のツールを使用",
    "tools.started": "実行中",
    "tools.completed": "完了",
    "tools.category.search": "検索",
    "tools.category.content": "コンテンツ",
    "tools.category.review": "レビュー",
    "tools.category.image": "画像生成",

    // Content
    "content.copy": "コピー",
    "content.copied": "コピーしました！",
    "content.chars": "文字",
    "content.title": "生成コンテンツ",
    "content.sources": "参照元",
    "review.title": "品質レビュー",
    "review.brandAlignment": "ブランド適合性",
    "review.audienceRelevance": "ターゲット適合性",
    "review.engagementPotential": "エンゲージメント",
    "review.clarity": "明確さ",
    "review.platformOptimization": "プラットフォーム最適化",
    "review.feedback": "フィードバック",

    // Theme / i18n
    "theme.light": "ライト",
    "theme.dark": "ダーク",

    // Suggestions
    "suggestions.title": "こんなトピックを試してみてください",
    "suggestions.1": "AIコードアシスタントの新機能ローンチ告知",
    "suggestions.2": "テックカンファレンス参加レポート",
    "suggestions.3": "エンジニアリングチームのカルチャー紹介",
    "suggestions.4": "AI最新トレンドと業界インサイト",

    // Footer area
    "footer.processing": "処理中",
    "footer.details": "処理の詳細",
    "footer.reasoning": "推論",
  },
};

export function t(key: string, locale: Locale): string {
  return translations[locale]?.[key] ?? key;
}
