"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { callShowMeHow } from "@/lib/client-ai";
import {
  canUseSpeechSynthesis,
  howToSpeechText,
  type HowToGuide,
  type HowToTopicId,
} from "@/lib/show-me-how";

export function ShowMeHow({
  topicId,
  context,
  hint,
}: {
  topicId: HowToTopicId;
  context?: Record<string, unknown>;
  /** Optional extra user message injected into the how-to request */
  hint?: string;
}) {
  const { t, lang } = useLanguage();
  const [guide, setGuide] = useState<HowToGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechOk, setSpeechOk] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSpeechOk(canUseSpeechSynthesis());
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function onShow() {
    setLoading(true);
    setError(null);
    setGuide(null);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }

    const res = await callShowMeHow({
      topicId,
      lang,
      message: hint,
      context,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!res.howTo) {
      setError(t("howtoFailed"));
      return;
    }
    setGuide(res.howTo);
  }

  function onSpeak() {
    if (!guide || !speechOk) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(howToSpeechText(guide));
    if (lang === "hi") utter.lang = "hi-IN";
    else if (lang === "pa") utter.lang = "pa-IN";
    else utter.lang = "en-IN";
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => {
      setSpeaking(false);
      setError(t("howtoSpeakFail"));
    };
    setSpeaking(true);
    synth.speak(utter);
  }

  return (
    <div className="ks-card space-y-3 border-l-4 border-l-[var(--brand)] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--brand-deep)]">
            {t("howtoTitle")}
          </h2>
          <p className="text-sm ks-muted">{t("howtoBody")}</p>
        </div>
        <button
          type="button"
          className="ks-btn ks-btn-primary min-h-14 shrink-0 px-5 text-base"
          onClick={onShow}
          disabled={loading}
        >
          {loading ? t("loading") : t("howtoAction")}
        </button>
      </div>

      {error && (
        <p className="text-base font-semibold text-[var(--danger)]">{error}</p>
      )}

      {guide && (
        <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-[var(--line)]">
          <section>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
              {t("howtoExplanation")}
            </h3>
            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {guide.explanation}
            </p>
          </section>

          {guide.visuals.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
                {t("howtoVisuals")}
              </h3>
              <p className="text-sm ks-muted">{t("howtoVisualsNote")}</p>
              <div className="grid gap-3">
                {guide.visuals.map((v) => (
                  <figure
                    key={v.id}
                    className="overflow-hidden rounded-2xl bg-[var(--bg)] ring-1 ring-[var(--line)]"
                  >
                    {/* Local curated SVG only — never remote invented URLs */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.src}
                      alt={v.altEn}
                      className="h-auto w-full"
                      loading="lazy"
                    />
                    <figcaption className="px-3 py-2 text-sm ks-muted">
                      {v.captionEn}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {guide.steps.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
                {t("howtoSteps")}
              </h3>
              <ol className="list-decimal space-y-2 pl-5 text-base leading-relaxed">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          {guide.materials.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
                {t("howtoMaterials")}
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-base">
                {guide.materials.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>
          )}

          {guide.warnings.length > 0 && (
            <section className="rounded-xl bg-[var(--accent-soft)] p-3">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--accent)]">
                {t("howtoWarnings")}
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-base">
                {guide.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          )}

          {guide.nextAction && (
            <section>
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--brand-deep)]">
                {t("howtoNext")}
              </h3>
              <p className="text-base font-semibold">{guide.nextAction}</p>
            </section>
          )}

          {speechOk ? (
            <button
              type="button"
              className="ks-btn ks-btn-secondary min-h-12 w-full text-base"
              onClick={onSpeak}
            >
              {speaking ? t("howtoSpeakStop") : t("howtoSpeak")}
            </button>
          ) : (
            <p className="text-sm ks-muted">{t("howtoSpeakUnsupported")}</p>
          )}
        </div>
      )}
    </div>
  );
}
