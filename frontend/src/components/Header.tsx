import { Globe, Moon, Sun } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  theme: "light" | "dark";
  locale: string;
  onToggleTheme: () => void;
  onToggleLocale: () => void;
}

export default function Header({
  title,
  subtitle,
  theme,
  locale,
  onToggleTheme,
  onToggleLocale,
}: HeaderProps) {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleLocale}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Switch language"
          >
            <Globe className="w-4 h-4" />
            {locale.toUpperCase()}
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
