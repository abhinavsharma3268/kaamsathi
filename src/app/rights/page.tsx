"use client";

import { useState } from "react";
import { AiBadge } from "@/components/Badges";
import { useLanguage } from "@/hooks/useLanguage";
import { callAi } from "@/lib/client-ai";
import { WELFARE_SOURCES } from "@/lib/welfare-sources";

export default function RightsPage() {
  const { t, lang } = useLanguage();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    setDisclaimer(null);

    const res = await callAi({
      module: "rights",
      lang,
      message: q.trim(),
      payload: {
        reminder:
          "Do not declare eligibility. Suggest checking official portals. Prefer curated sources.",
      },
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAnswer(res.answer);
    setSources(res.sources || []);
    setDisclaimer(res.disclaimer || null);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleRights")}
      </h1>

      <p className="text-sm ks-muted">{t("moduleRightsDesc")}</p>

      <form onSubmit={onAsk} className="ks-card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AiBadge />
        </div>
        <textarea
          className="ks-textarea"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("rightsPlaceholder")}
        />
        <button
          type="submit"
          className="ks-btn ks-btn-primary w-full"
          disabled={loading || !q.trim()}
        >
          {loading ? t("loading") : t("rightsSend")}
        </button>
        {error && (
          <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>
        )}
        {answer && (
          <div className="space-y-3">
            <div className="whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm leading-relaxed ring-1 ring-[var(--line)]">
              {answer}
            </div>
            {disclaimer && (
              <p className="text-xs font-semibold text-[var(--warn)]">{disclaimer}</p>
            )}
            {sources.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-bold">{t("sourceLabel")}</p>
                <ul className="space-y-2">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-[var(--brand)] underline"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </form>

      <section className="ks-card p-4">
        <h2 className="mb-2 font-bold">{t("sourceLabel")}</h2>
        <p className="mb-3 text-xs ks-muted">
          Verifiable portals used as reference. Always confirm on the official site.
        </p>
        <ul className="space-y-2">
          {WELFARE_SOURCES.map((s) => (
            <li key={s.id} className="rounded-xl bg-[var(--bg)] p-3 text-sm">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[var(--brand-deep)] underline"
              >
                {s.title}
              </a>
              <p className="mt-1 text-xs ks-muted">{s.notes}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
