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
      className={`mx-auto min-h-dvh w-full max-w-lg px-4 pb-24 pt-4 sm:max-w-2xl ${
        isHome ? "lg:max-w-5xl" : ""
      }`}
    >
      <header className="mb-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {!showCompactHeader && (
              <Link
                href="/"
                className="mb-2 inline-flex min-h-11 items-center rounded-full bg-white/80 px-4 text-base font-bold text-[var(--brand-deep)] ring-1 ring-[var(--line)]"
              >
                ← {t("navTalk")}
              </Link>
            )}
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo size="sm" priority={isHome} className="rounded-xl" />
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--brand-deep)]">
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
      <main>{children}</main>
      <footer className="mt-8 text-center text-sm ks-muted">{t("footerNote")}</footer>
      <BottomNav />
    </div>
  );
}
