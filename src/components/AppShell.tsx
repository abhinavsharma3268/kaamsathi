"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiStatus } from "./AiStatus";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/hooks/useLanguage";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isHome = pathname === "/";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-10 pt-5 sm:max-w-2xl">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          {!isHome && (
            <Link
              href="/"
              className="mb-2 inline-flex min-h-11 items-center rounded-full bg-white/80 px-3 text-sm font-bold text-[var(--brand-deep)] ring-1 ring-[var(--line)]"
            >
              ← {t("back")} · {t("home")}
            </Link>
          )}
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--brand-deep)] sm:text-4xl">
            {t("appName")}
          </p>
          <p className="mt-1 text-sm font-medium ks-muted">{t("tagline")}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <AiStatus />
          <LanguageSwitcher />
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-10 text-center text-xs ks-muted">{t("footerNote")}</footer>
    </div>
  );
}
