import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

interface ReasoningPanelProps {
  content: string;
  t: (key: string) => string;
  isGenerating: boolean;
}

/** Detect which reasoning phase(s) are present in the text */
type ReasoningPhase = "cot" | "react" | "reflect";

const PHASE_CONFIG: Record<
  ReasoningPhase,
  { icon: string; label: string; labelJa: string; color: string; bg: string; border: string }
> = {
  cot: {
    icon: "💭",
    label: "Chain-of-Thought",
    labelJa: "戦略分析",
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  react: {
    icon: "⚡",
    label: "ReAct",
    labelJa: "推論+行動",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  reflect: {
    icon: "🔍",
    label: "Self-Reflection",
    labelJa: "品質検証",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
};

// Keywords that signal each reasoning phase
const PHASE_KEYWORDS: Record<ReasoningPhase, RegExp> = {
  cot: /\b(analyz|strateg|audience|target|plan|key message|value proposition|topic|significance|step.by.step|identify|determine)\b/i,
  react: /\b(search|tool|generat|creat|web_search|file_search|generate_content|generate_image|action|invoke|using|call|brand guideline|trend)\b/i,
  reflect: /\b(review|evaluat|score|quality|improv|revis|brand.alignment|audience.relevance|engagement|clarity|optimization|self.reflect|feedback|axes)\b/i,
};

function detectPhases(text: string): ReasoningPhase[] {
  const phases: ReasoningPhase[] = [];
  const order: ReasoningPhase[] = ["cot", "react", "reflect"];
  for (const phase of order) {
    if (PHASE_KEYWORDS[phase].test(text)) {
      phases.push(phase);
    }
  }
  return phases.length > 0 ? phases : ["cot"]; // default to CoT at start
}

function detectActivePhase(text: string): ReasoningPhase {
  // The active phase is the LAST detected (most recent section of text)
  const lastChunk = text.slice(-500); // check the tail end
  if (PHASE_KEYWORDS.reflect.test(lastChunk)) return "reflect";
  if (PHASE_KEYWORDS.react.test(lastChunk)) return "react";
  return "cot";
}

export default function ReasoningPanel({
  content,
  t,
  isGenerating,
}: ReasoningPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const preview = useMemo(() => {
    if (!content) return "";
    return content.length > 100 ? content.substring(0, 100) + "..." : content;
  }, [content]);

  const phases = useMemo(() => detectPhases(content), [content]);
  const activePhase = useMemo(() => detectActivePhase(content), [content]);

  if (!content) return null;

  return (
    <div className="reasoning-indicator">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="reasoning-header"
        aria-expanded={expanded}
      >
        <span className="reasoning-toggle-icon">
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
        <span className="reasoning-summary-text">
          🧠 {t("reasoning.title")}
          {isGenerating && (
            <span className="reasoning-spinner">⏳ {t("reasoning.thinking")}</span>
          )}
          {!isGenerating && !expanded && (
            <span className="reasoning-preview"> — {preview}</span>
          )}
        </span>
      </button>

      {/* Reasoning Phase Badges */}
      <div className="flex flex-wrap gap-1.5 px-2 pt-2">
        {(["cot", "react", "reflect"] as ReasoningPhase[]).map((phase) => {
          const cfg = PHASE_CONFIG[phase];
          const reached = phases.includes(phase);
          const active = isGenerating && activePhase === phase;
          return (
            <span
              key={phase}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-300 ${
                active
                  ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-1 ring-offset-1 ring-current animate-pulse`
                  : reached
                    ? `${cfg.bg} ${cfg.color} ${cfg.border} opacity-90`
                    : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 opacity-50"
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              {reached && !active && !isGenerating && <span>✓</span>}
            </span>
          );
        })}
      </div>

      {/* Content (expanded) */}
      {expanded && (
        <div className="reasoning-content">
          <pre className="reasoning-text">{content}</pre>
        </div>
      )}
    </div>
  );
}
