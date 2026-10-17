"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiStatus } from "./AiStatus";
import { BottomNav } from "./BottomNav";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/hooks/useLanguage";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isHome = pathname === "/";
  const isSupport = pathname.startsWith("/support");
  const isProfile = pathname.startsWith("/profile");
  const showCompactHeader = isHome || isSupport || isProfile;

  return (
    <div
      className={`mx-auto flex w-full max-w-lg flex-col px-4 pt-3 sm:max-w-2xl ${
        isHome
          ? "h-dvh overflow-hidden pb-[5.5rem] lg:max-w-5xl"
          : "min-h-dvh pb-24"
      }`}
    >
      <header className={`shrink-0 ${isHome ? "mb-2" : "mb-4 space-y-2"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {!showCompactHeader && (
              <Link
                href="/"
                className="mb-2 inline-flex min-h-11 items-center rounded-full bg-white/80 px-4 text-base font-bold text-[var(--brand-deep)] ring-1 ring-[var(--line)]"
              >
                ← {t("navTalk")}
              </Link>
            )}
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo size="sm" priority={isHome} className="rounded-xl" />
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--brand-deep)] sm:text-2xl">
                  {t("appName")}
                </p>
                {!isHome && (
                  <p className="truncate text-sm font-semibold text-[var(--brand-deep)]">
                    {t("tagline")}
                  </p>
                )}
              </div>
            </Link>
          </div>
          <AiStatus />
        </div>
        {!isHome && <LanguageSwitcher />}
      </header>
      <main className={isHome ? "flex min-h-0 flex-1 flex-col" : undefined}>
        {children}
      </main>
      {!isHome && (
        <footer className="mt-8 text-center text-sm ks-muted">{t("footerNote")}</footer>
      )}
      <BottomNav />
    </div>
  );
}
