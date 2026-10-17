"use client";

import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { useLanguage } from "@/hooks/useLanguage";
import type { ChatResult } from "@/lib/chat-types";

export function ChatResultCard({ result }: { result: ChatResult }) {
  const { t } = useLanguage();

  if (result.kind === "follow_up" || result.kind === "error") return null;

  return (
    <div className="mt-2 space-y-2 rounded-2xl bg-white/90 p-3 ring-1 ring-[var(--line)]">
      {result.isEmergency && (
        <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-bold text-[var(--accent)]">
          {t("emergencyTitle")}
        </p>
      )}

      {result.earnings && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[var(--brand-soft)] p-2">
            <p className="ks-muted">{t("earningsNet")}</p>
            <p className="text-lg font-bold">₹{result.earnings.net}</p>
          </div>
          <div className="rounded-xl bg-[var(--brand-soft)] p-2">
            <p className="ks-muted">{t("earningsPerHour")}</p>
            <p className="text-lg font-bold">₹{result.earnings.perHour}</p>
          </div>
        </div>
      )}

      {result.portal?.recommendedPortal && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-[var(--brand-deep)]">
            {result.portal.recommendedPortal.displayName}
          </p>
          <a
            href={result.portal.recommendedPortal.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ks-btn ks-btn-primary min-h-11 w-full text-sm"
          >
            {t("cpOpenPortal")}
          </a>
          <p className="text-xs font-semibold text-[var(--warn)]">
            {t("cpNoSubmit")}
          </p>
        </div>
      )}

      {result.draft ? (
        <div className="space-y-2">
          <p className="text-sm font-bold text-[var(--brand-deep)]">
            {t("chatDraftTitle")}
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-xl bg-[var(--bg)] p-2 text-sm">
            {result.draft}
          </pre>
          <CopyButton text={result.draft} />
        </div>
      ) : null}

      {result.nextSteps && result.nextSteps.length > 0 && (
        <ol className="list-decimal space-y-1 pl-4 text-sm break-words [overflow-wrap:anywhere]">
          {result.nextSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}

      {result.sources && result.sources.length > 0 && (
        <ul className="space-y-1">
          {result.sources.slice(0, 4).map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[var(--brand)] underline"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      )}

      {result.deepLink && (
        <Link
          href={result.deepLink}
          className="inline-flex text-sm font-bold text-[var(--brand)] underline"
        >
          {t("chatOpenTool")}
        </Link>
      )}

      {result.disclaimer && (
        <p className="text-xs ks-muted">{result.disclaimer}</p>
      )}
    </div>
  );
}
