"use client";

import { LANG_OPTIONS } from "@/lib/i18n";
import { useLanguage } from "@/hooks/useLanguage";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  return (
    <label className="flex flex-col gap-1 min-w-[9rem]">
      <span className="text-xs font-bold uppercase tracking-wide ks-muted">
        {t("language")}
      </span>
      <select
        className="ks-select min-h-12"
        value={lang}
        onChange={(e) => setLang(e.target.value as typeof lang)}
        aria-label={t("chooseLanguage")}
      >
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.native}
          </option>
        ))}
      </select>
    </label>
  );
}
