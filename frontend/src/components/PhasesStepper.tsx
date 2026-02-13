import { useMemo } from "react";

interface PhasesStepperProps {
  reasoning: string;
  isGenerating: boolean;
  toolEvents: { tool: string; status: string }[];
  hasContent: boolean;
  t: (key: string) => string;
}

type Phase = "cot" | "react" | "reflect";

interface PhaseState {
  status: "pending" | "active" | "completed";
}

// Keywords that signal each reasoning phase
const PHASE_KEYWORDS: Record<Phase, RegExp> = {
  cot: /\b(analyz|strateg|audience|target|plan|key message|value proposition|topic|significance|step.by.step|identify|determine|evaluat.*topic|break.*down|consider)\b/i,
  react: /\b(search|tool|generat|creat|web_search|file_search|generate_content|generate_image|action|invoke|using|call|brand guideline|trend|content.*for|draft|compos|writ)\b/i,
  reflect: /\b(review|evaluat.*quality|score|improv|revis|brand.alignment|audience.relevance|engagement|platform.optimization|self.reflect|feedback|axes|final|polish|refin)\b/i,
};

function detectPhaseStates(
  reasoning: string,
  isGenerating: boolean,
  toolEvents: { tool: string; status: string }[],
  hasContent: boolean,
): Record<Phase, PhaseState> {
  const hasToolStarted = toolEvents.some((e) => e.status === "started" || e.status === "completed");
  const hasContentTool = toolEvents.some(
    (e) => (e.tool === "generate_content" || e.tool === "review_content") && e.status === "completed",
  );
  const hasReviewTool = toolEvents.some(
    (e) => e.tool === "review_content" && e.status === "completed",
  );

  // Check if reasoning text contains phase keywords
  const cotMatch = PHASE_KEYWORDS.cot.test(reasoning);
  const reactMatch = PHASE_KEYWORDS.react.test(reasoning) || hasToolStarted;
  const lastChunk = reasoning.slice(-500);
  const reflectMatch = PHASE_KEYWORDS.reflect.test(lastChunk) || hasReviewTool;

  // Determine active phase
  let activePhase: Phase = "cot";
  if (reflectMatch && (hasContentTool || hasReviewTool)) {
    activePhase = "reflect";
  } else if (reactMatch && hasToolStarted) {
    activePhase = "react";
  }

  const result: Record<Phase, PhaseState> = {
    cot: { status: "pending" },
    react: { status: "pending" },
    reflect: { status: "pending" },
  };

  if (!isGenerating && hasContent) {
    // All complete
    result.cot.status = "completed";
    result.react.status = "completed";
    result.reflect.status = "completed";
    return result;
  }

  if (!isGenerating && !hasContent) {
    return result; // all pending
  }

  // Generating — determine states
  const phases: Phase[] = ["cot", "react", "reflect"];
  const activeIdx = phases.indexOf(activePhase);

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (i < activeIdx) {
      result[phase].status = "completed";
    } else if (i === activeIdx) {
      result[phase].status = "active";
    } else {
      result[phase].status = "pending";
    }
  }

  return result;
}

const PHASE_CONFIG: Record<
  Phase,
  { icon: string; gradient: string; activeGlow: string }
> = {
  cot: {
    icon: "💭",
    gradient: "from-indigo-500 to-violet-600",
    activeGlow: "shadow-indigo-500/40",
  },
  react: {
    icon: "⚡",
    gradient: "from-amber-500 to-orange-600",
    activeGlow: "shadow-amber-500/40",
  },
  reflect: {
    icon: "🔍",
    gradient: "from-emerald-500 to-teal-600",
    activeGlow: "shadow-emerald-500/40",
  },
};

export default function PhasesStepper({
  reasoning,
  isGenerating,
  toolEvents,
  hasContent,
  t,
}: PhasesStepperProps) {
  const states = useMemo(
    () => detectPhaseStates(reasoning, isGenerating, toolEvents, hasContent),
    [reasoning, isGenerating, toolEvents, hasContent],
  );

  const phases: { key: Phase; label: string }[] = [
    { key: "cot", label: t("phase.cot") || "Strategic Analysis" },
    { key: "react", label: t("phase.react") || "Content Creation" },
    { key: "reflect", label: t("phase.reflect") || "Quality Review" },
  ];

  return (
    <div className="flex items-center gap-1 w-full px-1">
      {phases.map((phase, idx) => {
        const state = states[phase.key];
        const cfg = PHASE_CONFIG[phase.key];
        const isActive = state.status === "active";
        const isCompleted = state.status === "completed";
        const isPending = state.status === "pending";

        return (
          <div key={phase.key} className="flex items-center flex-1 min-w-0">
            {/* Phase step */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-500 w-full justify-center ${
                isActive
                  ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-lg ${cfg.activeGlow} scale-[1.02]`
                  : isCompleted
                    ? `bg-gradient-to-r ${cfg.gradient} text-white opacity-80`
                    : "bg-gray-100 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500"
              }`}
            >
              <span className="text-sm">{cfg.icon}</span>
              <span className="truncate">{phase.label}</span>
              {isActive && (
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
              {isCompleted && (
                <span className="flex-shrink-0 text-[10px]">✓</span>
              )}
            </div>

            {/* Connector line */}
            {idx < phases.length - 1 && (
              <div
                className={`flex-shrink-0 w-4 h-0.5 mx-0.5 transition-colors duration-500 ${
                  isCompleted
                    ? `bg-gradient-to-r ${cfg.gradient}`
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
