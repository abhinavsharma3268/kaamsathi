"use client";

import { AiBadge } from "./Badges";
import { useLanguage } from "@/hooks/useLanguage";

export function StructuredAnswer({
  simpleAnswer,
  nextSteps,
  sources,
  disclaimer,
  emergency,
  fallbackText,
}: {
  simpleAnswer?: string;
  nextSteps?: string[];
  sources?: { title: string; url: string }[];
  disclaimer?: string;
  emergency?: boolean;
  fallbackText?: string;
}) {
  const { t } = useLanguage();
  const body = simpleAnswer || fallbackText || "";

  return (
    <div
      className={`space-y-3 rounded-2xl bg-white p-4 text-base leading-relaxed ring-1 ring-[var(--line)] ${
        emergency ? "ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <AiBadge />
        {emergency && (
          <span className="ks-badge ks-badge-warn">{t("emergencyTitle")}</span>
        )}
      </div>

      <section>
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
          {t("answerSimple")}
        </h3>
        <p className="whitespace-pre-wrap">{body}</p>
      </section>

      {nextSteps && nextSteps.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
            {t("answerNext")}
          </h3>
          <ol className="list-decimal space-y-1 pl-5">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {sources && sources.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
            {t("answerSources")}
          </h3>
          <ul className="space-y-2">
            {sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--brand)] underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {disclaimer && (
        <p className="text-sm font-semibold text-[var(--warn)]">{disclaimer}</p>
      )}
    </div>
  );
}
