"use client";

import { useEffect, useState } from "react";
import { QuickActions } from "@/components/QuickActions";
import { ShowMeHow } from "@/components/ShowMeHow";
import { StructuredAnswer } from "@/components/StructuredAnswer";
import { VoiceInput } from "@/components/VoiceInput";
import { useLanguage } from "@/hooks/useLanguage";
import { callAi } from "@/lib/client-ai";
import { consumePrefill } from "@/lib/prefill";

type Msg = {
  role: "user" | "assistant";
  text: string;
  simpleAnswer?: string;
  nextSteps?: string[];
  disclaimer?: string;
  emergency?: boolean;
};

type Step = "form" | "result";

export default function SafetyPage() {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState<Step>("form");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pre = consumePrefill("safety");
    if (pre?.value) setInput(pre.value);
  }, []);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    setError(null);
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    setStep("result");

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
        text: res.answer,
        simpleAnswer: res.simpleAnswer || res.answer,
        nextSteps: res.nextSteps,
        disclaimer: res.disclaimer,
        emergency: Boolean(res.isEmergency),
      },
    ]);
  }

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    await ask(input);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleSafety")}
      </h1>

      <div className="ks-card border-l-4 border-l-[var(--accent)] bg-[var(--accent-soft)] p-4">
        <p className="font-bold text-[var(--accent)]">{t("emergencyTitle")}</p>
        <p className="mt-1 text-base leading-relaxed">{t("emergencyBody")}</p>
      </div>

      {step === "form" && (
        <>
          <ShowMeHow topicId="safety_guidance" />

          <div className="ks-card space-y-3 p-4">
            <QuickActions
              title={t("quickTitle")}
              actions={[
                {
                  id: "sleepy",
                  label: t("qaSleepy"),
                  value:
                    "I feel sleepy while driving for work. What should I do right now to stay safe?",
                },
                {
                  id: "accident",
                  label: t("qaAccident"),
                  value:
                    "I had a small accident while working. What immediate safety steps should I take?",
                },
              ]}
              onSelect={(value) => {
                setInput(value);
                void ask(value);
              }}
            />
          </div>

          <form onSubmit={onAsk} className="ks-card space-y-3 p-4">
            <textarea
              className="ks-textarea text-base"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("safetyPlaceholder")}
              rows={3}
            />
            <VoiceInput
              disabled={loading}
              onTranscript={(text) =>
                setInput((prev) => (prev ? `${prev.trim()} ${text}` : text))
              }
            />
            <button
              type="submit"
              className="ks-btn ks-btn-primary min-h-14 w-full text-base"
              disabled={loading || !input.trim()}
            >
              {loading ? t("loading") : t("safetySend")}
            </button>
          </form>
        </>
      )}

      {step === "result" && (
        <section className="ks-card min-h-[12rem] space-y-3 p-4">
          <div className="space-y-3">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div
                  key={`u-${i}`}
                  className="ml-4 rounded-2xl bg-[var(--brand-soft)] p-3 text-base leading-relaxed"
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ) : (
                <StructuredAnswer
                  key={`a-${i}`}
                  simpleAnswer={m.simpleAnswer}
                  nextSteps={m.nextSteps}
                  disclaimer={m.disclaimer}
                  emergency={m.emergency}
                  fallbackText={m.text}
                />
              ),
            )}
          </div>

          {loading && (
            <p className="text-base font-semibold text-[var(--brand-deep)]">
              {t("loading")}
            </p>
          )}
          {error && (
            <p className="text-base font-semibold text-[var(--danger)]">{error}</p>
          )}

          <button
            type="button"
            className="ks-btn ks-btn-secondary min-h-12 w-full text-base"
            onClick={() => {
              setStep("form");
              setError(null);
            }}
          >
            {t("back")}
          </button>
        </section>
      )}
    </div>
  );
}
