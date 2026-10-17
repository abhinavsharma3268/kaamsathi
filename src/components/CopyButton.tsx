"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";

export function CopyButton({ text }: { text: string }) {
  const { t } = useLanguage();
  const [done, setDone] = useState(false);

  async function onCopy() {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }

  return (
    <button type="button" className="ks-btn ks-btn-secondary" onClick={onCopy}>
      {done ? t("copied") : t("copy")}
    </button>
  );
}
