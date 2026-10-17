"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ModuleCard } from "@/components/ModuleCard";
import { useLanguage } from "@/hooks/useLanguage";
import type { ChatConversation } from "@/lib/chat-types";
import {
  deleteConversation,
  loadConversations,
} from "@/lib/chat-storage";
import { loadEarnings } from "@/lib/storage";

const STATUS_KEY: Record<ChatConversation["status"], string> = {
  in_progress: "supportStatusProgress",
  draft_ready: "supportStatusDraft",
  waiting_user: "supportStatusWaiting",
  completed: "supportStatusDone",
};

export default function SupportPage() {
  const { t } = useLanguage();
  const [convos, setConvos] = useState<ChatConversation[]>([]);
  const [earnCount, setEarnCount] = useState(0);

  function refresh() {
    setConvos(loadConversations());
    setEarnCount(loadEarnings().length);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-5">
      <section className="flex items-center gap-3">
        <BrandLogo size="md" />
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
            {t("supportTitle")}
          </h1>
          <p className="text-sm ks-muted">{t("supportBody")}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
          {t("supportRecentChats")}
        </h2>
        {convos.length === 0 ? (
          <p className="rounded-2xl bg-white/80 p-4 text-base ks-muted ring-1 ring-[var(--line)]">
            {t("supportEmptyChats")}
          </p>
        ) : (
          <ul className="space-y-2">
            {convos.slice(0, 12).map((c) => (
              <li
                key={c.id}
                className="ks-card flex items-start justify-between gap-2 p-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/?c=${encodeURIComponent(c.id)}`}
                    className="block font-bold text-[var(--brand-deep)] underline"
                  >
                    {c.title}
                  </Link>
                  <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">
                    {t(STATUS_KEY[c.status])}
                    {" · "}
                    {new Date(c.updatedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="ks-btn ks-btn-secondary min-h-10 rounded-xl px-3 text-xs"
                  onClick={() => {
                    deleteConversation(c.id);
                    refresh();
                  }}
                >
                  {t("supportDelete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
          {t("supportSavedDrafts")}
        </h2>
        {convos.filter((c) => c.savedDraft).length === 0 ? (
          <p className="text-sm ks-muted">{t("supportEmptyDrafts")}</p>
        ) : (
          <ul className="space-y-2">
            {convos
              .filter((c) => c.savedDraft)
              .slice(0, 5)
              .map((c) => (
                <li key={`d-${c.id}`} className="ks-card space-y-2 p-3">
                  <p className="text-sm font-bold">{c.title}</p>
                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-xs">
                    {c.savedDraft}
                  </pre>
                  <Link
                    href={`/?c=${encodeURIComponent(c.id)}`}
                    className="text-sm font-bold text-[var(--brand)] underline"
                  >
                    {t("supportContinue")}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
          {t("supportTools")}
        </h2>
        <p className="text-sm ks-muted">
          {t("supportEarningsCount")}: {earnCount}
        </p>
        <div className="grid gap-2">
          <ModuleCard
            href="/earnings"
            icon="₹"
            title={t("moduleEarnings")}
            description={t("moduleEarningsDesc")}
            accent="#d7efe4"
          />
          <ModuleCard
            href="/safety"
            icon="🛡"
            title={t("moduleSafety")}
            description={t("moduleSafetyDesc")}
            accent="#e8f0fe"
          />
          <ModuleCard
            href="/rights"
            icon="⚖"
            title={t("moduleRights")}
            description={t("moduleRightsDesc")}
            accent="#f8e6db"
          />
          <ModuleCard
            href="/documents"
            icon="📄"
            title={t("moduleDocs")}
            description={t("moduleDocsDesc")}
            accent="#e6f2ee"
          />
          <ModuleCard
            href="/grievance"
            icon="✍"
            title={t("moduleGrievance")}
            description={t("moduleGrievanceDesc")}
            accent="#fff3cd"
          />
          <ModuleCard
            href="/complaint-portal"
            icon="🏛"
            title={t("taskComplaintPortal")}
            description={t("taskComplaintPortalDesc")}
            accent="#dceee8"
          />
        </div>
      </section>
    </div>
  );
}
