"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiStatus } from "./AiStatus";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { getOccupation } from "@/lib/occupations";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { profile, ready } = useProfile();
  const isHome = pathname === "/";
  const isProfile = pathname === "/profile";
  const primaryLabel =
    ready && profile.primaryOccupation
      ? t(getOccupation(profile.primaryOccupation).nameKey)
      : null;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-10 pt-5 sm:max-w-2xl">
      <header className="mb-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            {!isHome && (
              <Link
                href="/"
                className="mb-2 inline-flex min-h-12 items-center rounded-full bg-white/80 px-4 text-base font-bold text-[var(--brand-deep)] ring-1 ring-[var(--line)]"
              >
                ← {t("back")} · {t("home")}
              </Link>
            )}
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--brand-deep)] sm:text-4xl">
              {t("appName")}
            </p>
            <p className="mt-1 text-base font-medium ks-muted">{t("tagline")}</p>
            {primaryLabel && (
              <p className="mt-1 text-sm font-semibold text-[var(--brand-deep)]">
                {primaryLabel}
                {!isProfile && (
                  <>
                    {" · "}
                    <Link href="/profile" className="underline">
                      {t("profileChange")}
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
          <AiStatus />
        </div>
        {!isHome && <LanguageSwitcher />}
      </header>
      <main>{children}</main>
      <footer className="mt-10 text-center text-sm ks-muted">{t("footerNote")}</footer>
    </div>
  );
}
