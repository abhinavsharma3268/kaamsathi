"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type { Lang } from "@/lib/i18n";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function speechLang(lang: Lang): string {
  if (lang === "hi") return "hi-IN";
  if (lang === "pa") return "pa-IN";
  return "en-IN";
}

export function VoiceInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const { t, lang } = useLanguage();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function toggle() {
    if (disabled) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSupported(false);
      setStatus(t("voiceUnsupported"));
      return;
    }

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = speechLang(lang);
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text);
      setStatus(null);
    };
    rec.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus(t("voiceDenied"));
      } else if (event.error === "no-speech") {
        setStatus(t("voiceNoSpeech"));
      } else {
        setStatus(t("voiceError"));
      }
    };
    rec.onend = () => setListening(false);

    try {
      rec.start();
      setListening(true);
      setStatus(t("voiceListening"));
    } catch {
      setListening(false);
      setStatus(t("voiceError"));
    }
  }

  if (supported === false) {
    return (
      <p className="text-sm font-semibold text-[var(--warn)]">{t("voiceUnsupported")}</p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={`ks-btn min-h-14 w-full rounded-2xl text-base ${
          listening ? "ks-btn-danger" : "ks-btn-secondary"
        }`}
        onClick={toggle}
        disabled={disabled || supported === null}
        aria-pressed={listening}
      >
        {listening ? t("voiceStop") : t("voiceStart")}
      </button>
      {status && <p className="text-sm ks-muted">{status}</p>}
    </div>
  );
}
