"use client";

import { useLanguage } from "@/hooks/useLanguage";

export function FactBadge() {
  const { t } = useLanguage();
  return <span className="ks-badge ks-badge-fact">{t("factLabel")}</span>;
}

export function AiBadge() {
  const { t } = useLanguage();
  return <span className="ks-badge ks-badge-ai">{t("aiLabel")}</span>;
}

export function WarnBadge({ children }: { children: React.ReactNode }) {
  return <span className="ks-badge ks-badge-warn">{children}</span>;
}
