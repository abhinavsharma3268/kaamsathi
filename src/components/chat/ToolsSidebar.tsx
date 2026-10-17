"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";

export const QUICK_TOOLS: { href: string; labelKey: string; descKey: string; icon: string }[] = [
  { href: "/earnings", labelKey: "moduleEarnings", descKey: "moduleEarningsDesc", icon: "₹" },
  { href: "/safety", labelKey: "moduleSafety", descKey: "moduleSafetyDesc", icon: "🛡️" },
  { href: "/rights", labelKey: "moduleRights", descKey: "moduleRightsDesc", icon: "📜" },
  { href: "/documents", labelKey: "moduleDocs", descKey: "moduleDocsDesc", icon: "📄" },
  { href: "/grievance", labelKey: "moduleGrievance", descKey: "moduleGrievanceDesc", icon: "✉️" },
];

function ToolList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t("supportTools")} className="space-y-2">
      {QUICK_TOOLS.map((q) => (
        <Link
          key={q.href}
          href={q.href}
          onClick={onNavigate}
          className="ks-card flex min-h-14 items-center gap-3 px-3 py-2 transition hover:ring-2 hover:ring-[var(--brand)]"
        >
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-base font-bold text-[var(--brand-deep)]"
          >
            {q.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-tight text-[var(--brand-deep)]">
              {t(q.labelKey)}
            </span>
            <span className="block truncate text-xs ks-muted">{t(q.descKey)}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

/** Static sidebar for wide screens. */
export function ToolsSidebar() {
  const { t } = useLanguage();
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-4 rounded-2xl bg-white/60 p-3 ring-1 ring-[var(--line)]">
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
          {t("supportTools")}
        </p>
        <ToolList />
      </div>
    </aside>
  );
}

/** Slide-in drawer for phones/tablets. */
export function ToolsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("supportTools")}>
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col gap-3 overflow-y-auto bg-[var(--bg)] p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-[var(--brand-deep)]">{t("supportTools")}</p>
          <button
            type="button"
            className="ks-btn ks-btn-secondary min-h-10 rounded-xl px-3 text-sm"
            onClick={onClose}
          >
            {t("close")}
          </button>
        </div>
        <ToolList onNavigate={onClose} />
      </div>
    </div>
  );
}
