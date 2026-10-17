"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";

export function AiStatus() {
  const { t } = useLanguage();
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.aiConfigured)))
      .catch(() => setConfigured(false));
  }, []);

  if (configured === null) return null;

  return (
    <span
      className={`ks-badge ${configured ? "ks-badge-fact" : "ks-badge-warn"}`}
      title={configured ? t("statusOk") : t("statusMissing")}
    >
      {configured ? t("statusOk") : t("statusMissing")}
    </span>
  );
}
