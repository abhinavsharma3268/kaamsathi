"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";

const ITEMS = [
  { href: "/", key: "navTalk" as const, icon: "💬" },
  { href: "/support", key: "navSupport" as const, icon: "📁" },
  { href: "/profile", key: "navProfile" as const, icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--line)] bg-white/95 backdrop-blur"
      aria-label={t("navMain")}
    >
      <div className="mx-auto flex max-w-lg justify-around gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:max-w-2xl lg:max-w-5xl">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center rounded-2xl px-2 text-center text-xs font-bold ${
                active
                  ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                  : "text-[var(--ink-muted)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.icon}
              </span>
              <span className="mt-0.5">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
