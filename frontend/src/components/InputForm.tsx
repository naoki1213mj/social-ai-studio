import { BookTemplate, ChevronDown, ChevronUp, Save, Send, Settings2, Square, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TemplatePreset {
  name: string;
  platforms: string[];
  contentType: string;
  language: string;
  reasoningEffort: string;
  persona: string;
  abMode: boolean;
  bilingual: boolean;
  bilingualStyle: string;
  seriesMode: boolean;
  seriesCount: number;
  defaultTopic: string;
}

interface InputFormProps {
  t: (key: string) => string;
  loading: boolean;
  onSubmit: (data: {
    message: string;
    platforms: string[];
    contentType: string;
    language: string;
    reasoningEffort: string;
    reasoningSummary: string;
    abMode: boolean;
    bilingual: boolean;
    bilingualStyle: string;
    persona: string;
    seriesMode: boolean;
    seriesCount: number;
  }) => void;
  onStop?: () => void;
  externalTopic?: string;
  onExternalTopicConsumed?: () => void;
}

const PLATFORMS = ["linkedin", "x", "instagram"] as const;
const CONTENT_TYPES = [
  "product_launch",
  "thought_leadership",
  "event_promotion",
  "event_recap",
  "company_culture",
  "tech_insight",
  "news_commentary",
  "tutorial_howto",
  "case_study",
  "behind_the_scenes",
  "announcement",
  "data_insight",
  "personal_branding",
  "recruitment",
  "seasonal",
  "custom",
] as const;

const REASONING_EFFORTS = [
  { value: "low", labelKey: "settings.reasoningEffort.low" },
  { value: "medium", labelKey: "settings.reasoningEffort.medium" },
  { value: "high", labelKey: "settings.reasoningEffort.high" },
] as const;

const REASONING_SUMMARIES = [
  { value: "off", labelKey: "settings.reasoningSummary.off" },
  { value: "auto", labelKey: "settings.reasoningSummary.auto" },
  { value: "concise", labelKey: "settings.reasoningSummary.concise" },
  { value: "detailed", labelKey: "settings.reasoningSummary.detailed" },
] as const;

const PERSONAS = [
  { value: "", labelKey: "persona.none" },
  { value: "professional", labelKey: "persona.professional" },
  { value: "casual", labelKey: "persona.casual" },
  { value: "technical", labelKey: "persona.technical" },
  { value: "executive", labelKey: "persona.executive" },
  { value: "creative", labelKey: "persona.creative" },
] as const;

const TEMPLATES_STORAGE_KEY = "social_ai_templates";

function loadTemplates(): TemplatePreset[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplates(templates: TemplatePreset[]) {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export default function InputForm({
  t,
  loading,
  onSubmit,
  onStop,
  externalTopic,
  onExternalTopicConsumed,
}: InputFormProps) {
  const [message, setMessage] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["linkedin", "x"]);
  const [contentType, setContentType] = useState("product_launch");
  const [customContentType, setCustomContentType] = useState("");
  const [language, setLanguage] = useState("en");
  const [reasoningEffort, setReasoningEffort] = useState("high");
  const [reasoningSummary, setReasoningSummary] = useState("auto");
  const [abMode, setAbMode] = useState(false);
  const [bilingual, setBilingual] = useState(false);
  const [bilingualStyle, setBilingualStyle] = useState("parallel");
  const [persona, setPersona] = useState("");
  const [seriesMode, setSeriesMode] = useState(false);
  const [seriesCount, setSeriesCount] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
  const [templates, setTemplates] = useState<TemplatePreset[]>(loadTemplates);
  const [showTemplates, setShowTemplates] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effective content type — use custom text when "custom" is selected
  const effectiveContentType = contentType === "custom" && customContentType.trim()
    ? customContentType.trim()
    : contentType;

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && loading) {
      e.preventDefault();
      onStop?.();
      return;
    }

    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!loading && message.trim() && platforms.length > 0) {
        onSubmit({
          message,
          platforms,
          contentType: effectiveContentType,
          language,
          reasoningEffort,
          reasoningSummary,
          abMode,
          bilingual,
          bilingualStyle,
          persona,
          seriesMode,
          seriesCount,
        });
      }
    }
  };

  // Handle external topic injection
  useEffect(() => {
    if (externalTopic) {
      setMessage(externalTopic);
      onExternalTopicConsumed?.();
    }
  }, [externalTopic, onExternalTopicConsumed]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || platforms.length === 0 || loading) return;
    onSubmit({
      message,
      platforms,
      contentType: effectiveContentType,
      language,
      reasoningEffort,
      reasoningSummary,
      abMode,
      bilingual,
      bilingualStyle,
      persona,
      seriesMode,
      seriesCount,
    });
  };

  const handleSaveTemplate = () => {
    const name = prompt(t("template.savePrompt") || "Template name:");
    if (!name) return;
    const tpl: TemplatePreset = {
      name, platforms, contentType, language, reasoningEffort, persona,
      abMode, bilingual, bilingualStyle, seriesMode, seriesCount,
      defaultTopic: message,
    };
    const updated = [...templates.filter(tp => tp.name !== name), tpl];
    setTemplates(updated);
    saveTemplates(updated);
  };

  const handleLoadTemplate = (tpl: TemplatePreset) => {
    setPlatforms(tpl.platforms);
    setContentType(tpl.contentType);
    setLanguage(tpl.language);
    setReasoningEffort(tpl.reasoningEffort);
    setPersona(tpl.persona || "");
    setAbMode(tpl.abMode);
    setBilingual(tpl.bilingual);
    setBilingualStyle(tpl.bilingualStyle);
    setSeriesMode(tpl.seriesMode || false);
    setSeriesCount(tpl.seriesCount || 3);
    if (tpl.defaultTopic) setMessage(tpl.defaultTopic);
    setShowTemplates(false);
  };

  const handleDeleteTemplate = (name: string) => {
    const updated = templates.filter(tp => tp.name !== name);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus(t("upload.uploading") || "Uploading...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/guidelines/upload", { method: "POST", body: formData });
      if (res.ok) {
        setUploadStatus(t("upload.success") || `✅ ${file.name} uploaded`);
      } else {
        const err = await res.json().catch(() => ({}));
        setUploadStatus(`❌ ${err.error || res.statusText}`);
      }
    } catch {
      setUploadStatus(t("upload.error") || "❌ Upload failed");
    }
    // Clear input so same file can be re-uploaded
    e.target.value = "";
    setTimeout(() => setUploadStatus(""), 5000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Template & Guidelines bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Template dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <BookTemplate className="w-3.5 h-3.5" />
            {t("template.label") || "Templates"}
          </button>
          {showTemplates && (
            <div className="absolute z-20 top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-1 max-h-48 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-xs text-gray-400 p-2 text-center">{t("template.empty") || "No saved templates"}</p>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group">
                    <button type="button" onClick={() => handleLoadTemplate(tpl)} className="flex-1 text-left text-xs text-gray-700 dark:text-gray-300 truncate">
                      {tpl.name}
                    </button>
                    <button type="button" onClick={() => handleDeleteTemplate(tpl.name)} className="opacity-0 group-hover:opacity-100 text-red-400 text-xs px-1">✕</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleSaveTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {t("template.save") || "Save"}
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Brand Guidelines Upload */}
        <input ref={fileInputRef} type="file" accept=".md,.txt,.pdf" onChange={handleFileUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {t("upload.guidelines") || "Upload Guidelines"}
        </button>
        {uploadStatus && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{uploadStatus}</span>
        )}
      </div>

      {/* Topic input */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
          {t("input.topic")}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          ref={textareaRef}
          placeholder={t("input.topic.placeholder")}
          rows={3}
          className="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 outline-none resize-none text-sm transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Platforms */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
          {t("input.platforms")}
        </label>
        <div className="flex gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                platforms.includes(p)
                  ? "platform-chip-active text-white"
                  : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 border border-gray-200/50 dark:border-gray-700/50"
              }`}
            >
              {t(`platforms.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Type & Language */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
            {t("input.contentType")}
          </label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200/60 dark:border-gray-700/60 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
          >
            {CONTENT_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {t(`contentType.${ct}`)}
              </option>
            ))}
          </select>
          {/* Custom content type freeform input */}
          {contentType === "custom" && (
            <input
              type="text"
              value={customContentType}
              onChange={(e) => setCustomContentType(e.target.value)}
              placeholder={t("input.topic.placeholder")}
              className="w-full mt-1.5 px-3 py-2 border border-gray-200/60 dark:border-gray-700/60 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
            {t("input.language")}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200/60 dark:border-gray-700/60 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
          >
            <option value="en">{t("language.en")}</option>
            <option value="ja">{t("language.ja")}</option>
            <option value="ko">{t("language.ko")}</option>
            <option value="zh">{t("language.zh")}</option>
            <option value="es">{t("language.es")}</option>
          </select>
        </div>
      </div>

      {/* AI Settings toggle */}
      <div className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl overflow-hidden bg-white/30 dark:bg-gray-800/30">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span className="font-medium">{t("settings.title")}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              🧠 {reasoningEffort} · {reasoningSummary}
              {abMode && " · A/B"}
              {bilingual && ` · 🌐 ${bilingualStyle === "combined" ? "EN+JA併記" : "EN+JA"}`}
              {persona && ` · 👤 ${persona}`}
              {seriesMode && ` · 📚 ×${seriesCount}`}
            </span>
          </div>
          {showSettings ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showSettings && (
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100 dark:border-gray-800">
            {/* Reasoning Effort */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                🧠 {t("settings.reasoningEffort")}
              </label>
              <div className="flex gap-1.5">
                {REASONING_EFFORTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReasoningEffort(opt.value)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      reasoningEffort === opt.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    title={t(opt.labelKey)}
                  >
                    {opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t(`settings.reasoningEffort.${reasoningEffort}`)}
              </p>
            </div>

            {/* Reasoning Summary */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                💭 {t("settings.reasoningSummary")}
              </label>
              <div className="flex gap-1.5">
                {REASONING_SUMMARIES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReasoningSummary(opt.value)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      reasoningSummary === opt.value
                        ? "bg-violet-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    title={t(opt.labelKey)}
                  >
                    {opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t(`settings.reasoningSummary.${reasoningSummary}`)}
              </p>
            </div>

            {/* A/B Comparison Mode */}
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-blue-500 to-purple-500 text-white">A/B</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("settings.abMode") || "A/B Comparison"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={abMode}
                    onChange={(e) => setAbMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500" />
                </div>
              </label>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t("settings.abMode.description") || "Generate two variants with different strategies for comparison"}
              </p>
            </div>

            {/* Bilingual Mode (EN + JA) */}
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-emerald-500 to-teal-500 text-white">🌐</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("settings.bilingual") || "Bilingual (EN + JA)"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={bilingual}
                    onChange={(e) => setBilingual(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500" />
                </div>
              </label>
              {bilingual && (
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setBilingualStyle("parallel")}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      bilingualStyle === "parallel"
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t("settings.bilingual.parallel") || "Parallel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBilingualStyle("combined")}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      bilingualStyle === "combined"
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t("settings.bilingual.combined") || "Combined"}
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {bilingual
                  ? (bilingualStyle === "combined"
                    ? (t("settings.bilingual.combined.description") || "EN + JA text in a single post")
                    : (t("settings.bilingual.parallel.description") || "Separate posts for each language"))
                  : (t("settings.bilingual.description") || "Generate content in both English and Japanese for each platform")
                }
              </p>
            </div>

            {/* Persona Setting */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                👤 {t("settings.persona") || "Persona / Tone"}
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {PERSONAS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPersona(p.value)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      persona === p.value
                        ? "bg-orange-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t(p.labelKey) || (p.value || "Default")}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t("settings.persona.description") || "Adjust the writing tone and style for your target audience"}
              </p>
            </div>

            {/* Series Mode */}
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white">📚</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("settings.seriesMode") || "Content Series"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={seriesMode}
                    onChange={(e) => setSeriesMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-amber-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-orange-500" />
                </div>
              </label>
              {seriesMode && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t("settings.seriesCount") || "Posts:"}</span>
                  {[3, 5, 7].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSeriesCount(n)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        seriesCount === n
                          ? "bg-amber-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t("settings.seriesMode.description") || "Generate a multi-post series with a narrative arc"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Submit / Stop */}
      <div className="flex gap-2">
        {loading ? (
          <button
            type="button"
            onClick={onStop}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <Square className="w-4 h-4" />
            {t("input.stop")}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim() || platforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 btn-gradient disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold"
          >
            <Send className="w-4 h-4" />
            {t("input.submit")}
            <span className="text-xs opacity-60 ml-1">⌘↵</span>
          </button>
        )}
      </div>
    </form>
  );
}
