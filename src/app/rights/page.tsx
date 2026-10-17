"use client";

import { useEffect, useMemo, useState } from "react";
import { QuickActions } from "@/components/QuickActions";
import { ShowMeHow } from "@/components/ShowMeHow";
import { StructuredAnswer } from "@/components/StructuredAnswer";
import { VoiceInput } from "@/components/VoiceInput";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { callAi } from "@/lib/client-ai";
import { sortSourcesForOccupation } from "@/lib/occupations";
import { consumePrefill } from "@/lib/prefill";
import { WELFARE_SOURCES } from "@/lib/welfare-sources";

export default function RightsPage() {
  const { t, lang } = useLanguage();
  const { profile } = useProfile();
  const [q, setQ] = useState("");
  const officialSources = useMemo(
    () => sortSourcesForOccupation(WELFARE_SOURCES, profile.primaryOccupation),
    [profile.primaryOccupation],
  );
  const [simpleAnswer, setSimpleAnswer] = useState<string | null>(null);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pre = consumePrefill("rights");
    if (pre?.value) setQ(pre.value);
  }, []);

  async function ask(question: string) {
    const message = question.trim();
    if (!message || loading) return;
    setLoading(true);
    setError(null);
    setSimpleAnswer(null);
    setNextSteps([]);
    setSources([]);
    setDisclaimer(null);

    const res = await callAi({
      module: "rights",
      lang,
      message,
      payload: {
        reminder:
          "Do not declare eligibility. Suggest checking official portals. Prefer curated sources. Keep simpleAnswer short and everyday.",
      },
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSimpleAnswer(res.simpleAnswer || res.answer);
    setNextSteps(res.nextSteps || []);
    setSources(res.sources || []);
    setDisclaimer(res.disclaimer || null);
  }

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    await ask(q);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleRights")}
      </h1>

      <p className="text-base ks-muted">{t("moduleRightsDesc")}</p>

      <ShowMeHow topicId="welfare_schemes" />

      <div className="ks-card space-y-3 p-4">
        <QuickActions
          title={t("quickTitle")}
          actions={[
            {
              id: "insurance",
              label: t("qaInsurance"),
              value:
                "Can a gig or daily-wage worker get health insurance in India? Do not say I am eligible. Explain how to check official schemes.",
            },
            {
              id: "eshram",
              label: t("qaEshram"),
              value:
                "What is e-Shram? What benefits might be linked, and how do I check without assuming I qualify?",
            },
          ]}
          onSelect={(value) => {
            setQ(value);
            void ask(value);
          }}
        />
      </div>

      <form onSubmit={onAsk} className="ks-card space-y-3 p-4">
        <textarea
          className="ks-textarea text-base"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("rightsPlaceholder")}
          rows={3}
        />
        <VoiceInput
          disabled={loading}
          onTranscript={(text) =>
            setQ((prev) => (prev ? `${prev.trim()} ${text}` : text))
          }
        />
        <button
          type="submit"
          className="ks-btn ks-btn-primary min-h-14 w-full text-base"
          disabled={loading || !q.trim()}
        >
          {loading ? t("loading") : t("rightsSend")}
        </button>
        {error && (
          <p className="text-base font-semibold text-[var(--danger)]">{error}</p>
        )}
        {simpleAnswer && (
          <StructuredAnswer
            simpleAnswer={simpleAnswer}
            nextSteps={nextSteps}
            sources={sources}
            disclaimer={disclaimer || undefined}
          />
        )}
      </form>

      <section className="ks-card p-4">
        <h2 className="mb-2 text-lg font-bold">{t("sourceLabel")}</h2>
        <p className="mb-3 text-sm ks-muted">{t("rightsSourcesIntro")}</p>
        <p className="mb-2 text-sm font-semibold text-[var(--brand-deep)]">
          {t("rightsSourcesPersonalized")}
        </p>
        <ul className="space-y-2">
          {officialSources.map((s) => (
            <li key={s.id} className="rounded-xl bg-[var(--bg)] p-3 text-base">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[var(--brand-deep)] underline"
              >
                {s.title}
              </a>
              <p className="mt-1 text-sm ks-muted">{s.notes}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
