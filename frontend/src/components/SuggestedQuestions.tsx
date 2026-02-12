import { Lightbulb } from "lucide-react";

interface SuggestedQuestionsProps {
  t: (key: string) => string;
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  { key: "suggestions.1", icon: "🚀" },
  { key: "suggestions.2", icon: "🎤" },
  { key: "suggestions.3", icon: "👥" },
  { key: "suggestions.4", icon: "📊" },
] as const;

export default function SuggestedQuestions({
  t,
  onSelect,
  disabled = false,
}: SuggestedQuestionsProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
        <Lightbulb className="w-4 h-4" />
        <span>{t("suggestions.title")}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUGGESTIONS.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(t(item.key))}
            disabled={disabled}
            className="flex items-center gap-2.5 px-4 py-3 text-left text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-lg shrink-0">{item.icon}</span>
            <span className="text-gray-700 dark:text-gray-300 line-clamp-2">
              {t(item.key)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
