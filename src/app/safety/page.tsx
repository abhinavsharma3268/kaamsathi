"use client";

import { useState } from "react";
import { AiBadge } from "@/components/Badges";
import { useLanguage } from "@/hooks/useLanguage";
import { callAi } from "@/lib/client-ai";

type Msg = { role: "user" | "assistant"; text: string; emergency?: boolean };

export default function SafetyPage() {
  const { t, lang } = useLanguage();
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    setError(null);
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setLoading(true);

    const res = await callAi({
      module: "safety",
      lang,
      message: q,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setMsgs((m) => [
      ...m,
      {
        role: "assistant",
        text: res.answer + (res.disclaimer ? `\n\n${res.disclaimer}` : ""),
        emergency: Boolean(res.isEmergency),
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleSafety")}
      </h1>

      <div className="ks-card border-l-4 border-l-[var(--accent)] bg-[var(--accent-soft)] p-4">
        <p className="font-bold text-[var(--accent)]">{t("emergencyTitle")}</p>
        <p className="mt-1 text-sm leading-relaxed">{t("emergencyBody")}</p>
      </div>

      <div className="ks-card min-h-[16rem] space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AiBadge />
          <span className="text-sm ks-muted">{t("moduleSafetyDesc")}</span>
        </div>

        {msgs.length === 0 && (
          <p className="text-sm ks-muted">{t("safetyPlaceholder")}</p>
        )}

        <div className="space-y-3">
          {msgs.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`rounded-2xl p-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-6 bg-[var(--brand-soft)]"
                  : "mr-2 bg-white ring-1 ring-[var(--line)]"
              } ${m.emergency ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              {m.emergency && (
                <p className="mb-2 font-bold text-[var(--accent)]">
                  {t("emergencyTitle")}
                </p>
              )}
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          ))}
        </div>

        {loading && <p className="text-sm font-semibold">{t("loading")}</p>}
        {error && (
          <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>
        )}
      </div>

      <form onSubmit={onAsk} className="space-y-3">
        <textarea
          className="ks-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("safetyPlaceholder")}
          rows={3}
        />
        <button
          type="submit"
          className="ks-btn ks-btn-primary w-full"
          disabled={loading || !input.trim()}
        >
          {loading ? t("loading") : t("safetySend")}
        </button>
      </form>
    </div>
  );
}
