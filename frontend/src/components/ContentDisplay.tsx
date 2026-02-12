import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import ContentCards, { type StructuredOutput } from "./ContentCards";

interface ContentDisplayProps {
  content: string;
  t: (key: string) => string;
  isGenerating: boolean;
  onRefine?: (platform: string, feedback: string) => void;
}

/**
 * Try to parse structured JSON output from the agent response.
 * The agent wraps JSON in ```json fences, or may return raw JSON.
 */
function tryParseStructuredOutput(content: string): StructuredOutput | null {
  if (!content) return null;

  // Try to extract JSON from ```json ... ``` fences
  const fenceMatch = content.match(/```json\s*\n?([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : content.trim();

  // Quick check — must look like JSON object
  if (!jsonStr.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(jsonStr);
    // Validate minimum structure
    if (parsed.contents && Array.isArray(parsed.contents) && parsed.contents.length > 0) {
      return parsed as StructuredOutput;
    }
  } catch {
    // Not valid JSON yet (might be streaming partial)
  }

  return null;
}

export default function ContentDisplay({
  content,
  t,
  isGenerating,
  onRefine,
}: ContentDisplayProps) {
  const [copied, setCopied] = useState(false);

  // Try to parse structured output
  const structured = useMemo(() => tryParseStructuredOutput(content), [content]);

  if (!content && !isGenerating) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // If structured JSON was parsed successfully, show platform cards
  if (structured && !isGenerating) {
    return <ContentCards data={structured} t={t} onRefine={onRefine} />;
  }

  // Fallback: show raw Markdown (during streaming or for non-JSON output)
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Header with copy */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {isGenerating ? t("input.generating") : `${content.length.toLocaleString()} ${t("content.chars")}`}
        </span>
        <button
          onClick={handleCopy}
          disabled={!content}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              {t("content.copied")}
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              {t("content.copy")}
            </>
          )}
        </button>
      </div>

      {/* Markdown content */}
      <div className="prose dark:prose-invert max-w-none px-5 py-4 text-sm">
        {content ? (
          <Markdown>{content}</Markdown>
        ) : isGenerating ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-2/3" />
            <div className="flex items-center gap-2 mt-4 text-gray-400">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "300ms" }} />
              <span className="text-xs ml-1">{t("input.generating")}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
