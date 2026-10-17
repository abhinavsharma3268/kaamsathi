"use client";

import { useRouter } from "next/navigation";
import { ModuleCard } from "@/components/ModuleCard";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ProfileSetup } from "@/components/ProfileSetup";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import {
  getOccupation,
  personalizedHomeTasks,
  personalizedQuickPrompts,
} from "@/lib/occupations";
import { setPrefill } from "@/lib/prefill";
import Link from "next/link";

export default function HomePage() {
  const { t } = useLanguage();
  const { profile, ready, setupDone } = useProfile();
  const router = useRouter();
  const primary = profile.primaryOccupation;
  const tasks = personalizedHomeTasks(primary);
  const prompts = personalizedQuickPrompts(primary);
  const occ = getOccupation(primary);

  function onQuick(prompt: (typeof prompts)[number]) {
    if (prompt.value) {
      setPrefill({
        module: prompt.module,
        value: prompt.value,
        field:
          prompt.module === "grievance"
            ? "issue"
            : prompt.module === "documents"
              ? "document"
              : "question",
      });
    }
    router.push(prompt.href);
  }

  return (
    <div className="space-y-5">
      <section className="ks-card space-y-4 p-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-[var(--brand-deep)]">
          {t("dashboardTitle")}
        </h1>
        <p className="text-base leading-relaxed ks-muted">
          {t("dashboardSubtitle")}
        </p>
        <LanguagePicker large />
        {ready && setupDone && primary && (
          <p className="text-base font-semibold text-[var(--brand-deep)]">
            {t("profileForYou")}: {t(occ.nameKey)}
            {" · "}
            <Link href="/profile" className="underline">
              {t("profileChange")}
            </Link>
          </p>
        )}
        <p className="text-sm font-semibold text-[var(--accent)]">{t("demoNote")}</p>
      </section>

      {ready && !setupDone && <ProfileSetup />}

      <ModuleCard
        href="/complaint-portal"
        icon="🏛"
        title={t("taskComplaintPortal")}
        description={t("taskComplaintPortalDesc")}
        accent="#dceee8"
        large
      />

      {ready && setupDone && prompts.length > 0 && (
        <section className="ks-card space-y-3 p-4">
          <h2 className="text-lg font-bold text-[var(--brand-deep)]">
            {t("profileQuickTitle")}
          </h2>
          <p className="text-sm ks-muted">{t("profileQuickBody")}</p>
          <div className="flex flex-col gap-2">
            {prompts.map((p) => (
              <button
                key={p.id}
                type="button"
                className="ks-btn ks-btn-secondary min-h-14 w-full justify-start rounded-2xl px-4 text-left text-base"
                onClick={() => onQuick(p)}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3">
        {tasks.map((task) => (
          <ModuleCard
            key={task.id}
            href={task.href}
            icon={task.icon}
            title={t(task.titleKey)}
            description={t(task.descKey)}
            accent={task.accent}
            large
          />
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--brand-deep)]">{t("moreTools")}</h2>
        <div className="grid gap-3">
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
          <ModuleCard
            href="/complaint-portal"
            icon="🏛"
            title={t("taskComplaintPortal")}
            description={t("taskComplaintPortalDesc")}
            accent="#dceee8"
          />
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
            href="/profile"
            icon="👤"
            title={t("profilePageTitle")}
            description={t("profilePageBody")}
            accent="#e8eef5"
          />
        </div>
      </section>
    </div>
  );
}
