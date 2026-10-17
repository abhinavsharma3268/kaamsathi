"use client";

import { ModuleCard } from "@/components/ModuleCard";
import { useLanguage } from "@/hooks/useLanguage";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      <section className="ks-card p-5">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--brand-deep)] sm:text-3xl">
          {t("dashboardTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed ks-muted sm:text-base">
          {t("dashboardSubtitle")}
        </p>
        <p className="mt-3 text-xs font-semibold text-[var(--accent)]">
          {t("demoNote")}
        </p>
      </section>

      <div className="grid gap-3">
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
          accent="#efe8ff"
        />
        <ModuleCard
          href="/grievance"
          icon="✍"
          title={t("moduleGrievance")}
          description={t("moduleGrievanceDesc")}
          accent="#fff3cd"
        />
      </div>
    </div>
  );
}
