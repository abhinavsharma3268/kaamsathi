"use client";

import { LANG_OPTIONS, type Lang } from "@/lib/i18n";
import { useLanguage } from "@/hooks/useLanguage";

export function LanguagePicker({ large = false }: { large?: boolean }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div role="group" aria-label={t("chooseLanguage")}>
      <div className={`grid grid-cols-3 gap-2 ${large ? "gap-3" : ""}`}>
        {LANG_OPTIONS.map((opt) => {
          const active = lang === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLang(opt.code as Lang)}
              className={`ks-btn rounded-2xl ${
                large ? "min-h-14 text-base" : "min-h-11 text-sm"
              } ${active ? "ks-btn-primary" : "ks-btn-secondary"}`}
              aria-pressed={active}
            >
              {opt.native}
            </button>
          );
        })}
      </div>
    </div>
  );
}
