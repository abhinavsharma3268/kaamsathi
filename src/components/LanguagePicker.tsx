"use client";

import { LANG_OPTIONS, type Lang } from "@/lib/i18n";
import { useLanguage } from "@/hooks/useLanguage";

export function LanguagePicker({ large = false }: { large?: boolean }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="space-y-2" role="group" aria-label={t("chooseLanguage")}>
      <p className={`font-bold text-[var(--brand-deep)] ${large ? "text-lg" : "text-sm"}`}>
        {t("chooseLanguage")}
      </p>
      <div className={`grid grid-cols-3 gap-2 ${large ? "gap-3" : ""}`}>
        {LANG_OPTIONS.map((opt) => {
          const active = lang === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLang(opt.code as Lang)}
              className={`ks-btn min-h-14 rounded-2xl text-base ${
                active ? "ks-btn-primary" : "ks-btn-secondary"
              }`}
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
