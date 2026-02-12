import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { ToolEvent } from "../lib/api";

interface ToolEventsProps {
  events: ToolEvent[];
  t: (key: string) => string;
  isGenerating?: boolean;
}

/** Display config for each tool */
const TOOL_CONFIG: Record<string, { icon: string; label: string; category: string }> = {
  web_search: { icon: "🌐", label: "Web Search", category: "search" },
  file_search: { icon: "📁", label: "File Search", category: "search" },
  generate_content: { icon: "✏️", label: "Generate Content", category: "content" },
  review_content: { icon: "📋", label: "Review Content", category: "review" },
  generate_image: { icon: "🖼️", label: "Generate Image", category: "image" },
};

export default function ToolEvents({
  events,
  t,
  isGenerating = false,
}: ToolEventsProps) {
  const [expanded, setExpanded] = useState(false);

  // Deduplicate: keep latest event per tool name
  const latestByTool = useMemo(() => {
    const map = new Map<string, ToolEvent>();
    events.forEach((ev) => map.set(ev.tool, ev));
    return Array.from(map.values());
  }, [events]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof latestByTool>();
    latestByTool.forEach((ev) => {
      const cat = TOOL_CONFIG[ev.tool]?.category ?? "other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(ev);
    });
    return groups;
  }, [latestByTool]);

  if (latestByTool.length === 0) return null;

  const toolCount = latestByTool.length;
  const statusText = isGenerating ? t("tools.running") : t("tools.used");

  return (
    <div className="tool-status-container">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="tool-status-header"
        aria-expanded={expanded}
      >
        <span className="tool-toggle-icon">
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
        <span className="tool-summary-text">
          🛠️ {toolCount}{statusText}
          {isGenerating && <span className="tool-spinner">⏳</span>}
        </span>
      </button>

      {/* Tool list (expanded) */}
      {expanded && (
        <div className="tool-status-list">
          {Array.from(grouped.entries()).map(([category, tools]) => (
            <div key={category} className="tool-category-group">
              <span className="tool-category-label">
                {t(`tools.category.${category}`) || category}
              </span>
              {tools.map((ev, i) => {
                const config = TOOL_CONFIG[ev.tool];
                return (
                  <div key={`${ev.tool}-${i}`} className="tool-item">
                    <span className="tool-item-icon">
                      {config?.icon ?? "🔧"}
                    </span>
                    <span className="tool-item-name">
                      {config?.label ?? ev.tool}
                    </span>
                    <span
                      className={`tool-item-status ${
                        ev.status === "completed"
                          ? "status-completed"
                          : ev.status === "error"
                            ? "status-error"
                            : "status-running"
                      }`}
                    >
                      {ev.status === "completed"
                        ? "✅"
                        : ev.status === "error"
                          ? "❌"
                          : "⏳"}
                      {" "}
                      {t(`tools.${ev.status}`)}
                    </span>
                    {ev.message && (
                      <span className="tool-item-message">{ev.message}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
