import { useCallback, useState } from "react";
import type { Locale } from "../lib/i18n";
import { t } from "../lib/i18n";

export function useI18n(initial: Locale = "ja") {
  const [locale, setLocale] = useState<Locale>(initial);

  const translate = useCallback(
    (key: string) => t(key, locale),
    [locale],
  );

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === "en" ? "ja" : "en"));
  }, []);

  return { locale, setLocale, t: translate, toggleLocale } as const;
}
