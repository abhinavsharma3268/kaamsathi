"use client";

import { CopyButton } from "./CopyButton";
import { useLanguage } from "@/hooks/useLanguage";
import type { ComplaintPortalResult } from "@/lib/complaint-router";
import Link from "next/link";

export function ComplaintPortalCard({
  result,
  onNotRight,
  onMoreHelp,
}: {
  result: ComplaintPortalResult;
  onNotRight: () => void;
  onMoreHelp: () => void;
}) {
  const { t } = useLanguage();
  const portal = result.recommendedPortal;

  return (
    <div className="ks-card space-y-4 border-l-4 border-l-[var(--brand)] p-4">
      <p className="text-sm font-semibold text-[var(--warn)]">{result.disclaimer}</p>

      {/* workerReport is shown as the Saath chat bubble on the page */}

      {result.isEmergency && (
        <div className="rounded-2xl bg-[var(--accent-soft)] p-4">
          <p className="font-bold text-[var(--accent)]">{t("emergencyTitle")}</p>
          <p className="mt-1 text-base">{result.reason}</p>
          <Link
            href="/safety"
            className="ks-btn ks-btn-primary mt-3 min-h-14 w-full text-base"
          >
            {t("moduleSafety")}
          </Link>
        </div>
      )}

      {result.status === "recommendation" && portal && (
        <>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
              {t("cpRecommended")}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--ink)]">
              {portal.displayName}
            </h2>
            <p className="mt-1 text-sm ks-muted">{portal.responsibleDepartment}</p>
          </div>

          <section>
            <h3 className="mb-1 text-sm font-bold text-[var(--brand-deep)]">
              {t("cpWhy")}
            </h3>
            <p className="text-base leading-relaxed">{result.reason}</p>
          </section>

          <section className="rounded-xl bg-[var(--accent-soft)] p-3">
            <h3 className="mb-1 text-sm font-bold text-[var(--accent)]">
              {t("cpCaveat")}
            </h3>
            <p className="text-base leading-relaxed">{result.eligibilityCaveat}</p>
          </section>

          {result.preparationChecklist.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-bold text-[var(--brand-deep)]">
                {t("cpPrepare")}
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-base">
                {result.preparationChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {result.nextSteps.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-bold text-[var(--brand-deep)]">
                {t("cpSteps")}
              </h3>
              <ol className="list-decimal space-y-1 pl-5 text-base">
                {result.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          <p className="text-base font-semibold text-[var(--warn)]">
            {t("cpNoSubmit")}
          </p>
          <p className="text-sm font-bold text-[var(--brand-deep)]">
            {t("cpLinkLabel")}
          </p>
          <a
            href={portal.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ks-btn ks-btn-primary min-h-14 w-full text-base"
          >
            {t("cpOpenPortal")}
          </a>
          <p className="break-all text-base font-semibold text-[var(--brand)]">
            <a
              href={portal.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {portal.officialUrl}
            </a>
          </p>
        </>
      )}

      {result.status === "manual_assistance" && !result.isEmergency && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[var(--brand-deep)]">
            {t("cpManualTitle")}
          </h2>
          <p className="text-base leading-relaxed">{result.reason}</p>
          <p className="text-base">{result.eligibilityCaveat}</p>
          <ol className="list-decimal space-y-1 pl-5 text-base">
            {result.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Link
            href="/grievance"
            className="ks-btn ks-btn-secondary min-h-14 w-full text-base"
          >
            {t("moduleGrievance")}
          </Link>
        </section>
      )}

      {result.alternativePortals.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-[var(--brand-deep)]">
            {t("cpAlternatives")}
          </h3>
          <ul className="space-y-2">
            {result.alternativePortals.map((p) => (
              <li key={p.id} className="rounded-xl bg-[var(--bg)] p-3">
                <a
                  href={p.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[var(--brand)] underline"
                >
                  {p.displayName}
                </a>
                <p className="mt-1 text-sm ks-muted">{p.exclusions}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.officialSources.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-[var(--brand-deep)]">
            {t("answerSources")}
          </h3>
          <ul className="space-y-1">
            {result.officialSources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-[var(--brand)] underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.draftedMessage ? (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[var(--brand-deep)]">
            {t("cpDraftedMessage")}
          </h3>
          <p className="text-sm ks-muted">{t("cpDraftedHint")}</p>
          <pre className="whitespace-pre-wrap rounded-2xl bg-[var(--bg)] p-3 text-base leading-relaxed ring-1 ring-[var(--line)]">
            {result.draftedMessage}
          </pre>
          <CopyButton text={result.draftedMessage} />
        </section>
      ) : null}

      {result.copyableSummary && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[var(--brand-deep)]">
            {t("cpCopySummary")}
          </h3>
          <pre className="whitespace-pre-wrap rounded-2xl bg-[var(--bg)] p-3 text-sm ring-1 ring-[var(--line)]">
            {result.copyableSummary}
          </pre>
          <CopyButton text={result.copyableSummary} />
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="ks-btn ks-btn-secondary min-h-12 flex-1 text-base"
          onClick={onNotRight}
        >
          {t("cpNotRight")}
        </button>
        <button
          type="button"
          className="ks-btn ks-btn-secondary min-h-12 flex-1 text-base"
          onClick={onMoreHelp}
        >
          {t("cpMoreHelp")}
        </button>
      </div>
    </div>
  );
}
