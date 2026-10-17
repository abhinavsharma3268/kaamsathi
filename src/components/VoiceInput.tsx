"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type { Lang } from "@/lib/i18n";

function speechLang(lang: Lang): string {
  if (lang === "hi") return "hi-IN";
  if (lang === "pa") return "pa-IN";
  return "en-IN";
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: {
    results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
  }) => void) | null;
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

async function warmMic(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export function VoiceInput({
  onTranscript,
  disabled,
  compact = false,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t, lang } = useLanguage();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const stoppingRef = useRef(false);
  const langRef = useRef<Lang>(lang);
  langRef.current = lang;

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      try {
        if (recRef.current?.abort) recRef.current.abort();
        else recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function stopRec() {
    stoppingRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  async function toggle() {
    if (disabled) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSupported(false);
      setStatus(t("voiceUnsupported"));
      return;
    }

    if (listening) {
      stopRec();
      setStatus(null);
      return;
    }

    setStatus(t("voiceListening"));
    const allowed = await warmMic();
    if (!allowed) {
      setStatus(t("voiceDenied"));
      return;
    }

    stoppingRef.current = false;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = speechLang(langRef.current);
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (!text) return;
      if (last.isFinal === false) {
        setStatus(text);
        return;
      }
      onTranscript(text);
      setStatus(null);
      stopRec();
    };

    rec.onerror = (event) => {
      // Aborts from our own stop() are not real failures.
      if (stoppingRef.current || event.error === "aborted") {
        setListening(false);
        return;
      }
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus(t("voiceDenied"));
      } else if (event.error === "no-speech") {
        setStatus(t("voiceNoSpeech"));
      } else if (event.error === "network") {
        setStatus(t("voiceNetwork"));
      } else {
        setStatus(t("voiceError"));
      }
    };

    rec.onend = () => {
      setListening(false);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setStatus(t("voiceError"));
    }
  }

  if (supported === false) {
    if (compact) return null;
    return (
      <p className="text-sm font-semibold text-[var(--warn)]">{t("voiceUnsupported")}</p>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        className={`ks-btn h-12 w-12 shrink-0 rounded-full p-0 text-lg ${
          listening ? "ks-btn-danger" : "ks-btn-secondary"
        }`}
        onClick={() => void toggle()}
        disabled={disabled || supported === null}
        aria-pressed={listening}
        aria-label={listening ? t("voiceStop") : t("voiceStart")}
        title={listening ? t("voiceStop") : t("voiceStart")}
      >
        {listening ? "■" : "🎤"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={`ks-btn min-h-14 w-full rounded-2xl text-base ${
          listening ? "ks-btn-danger" : "ks-btn-secondary"
        }`}
        onClick={() => void toggle()}
        disabled={disabled || supported === null}
        aria-pressed={listening}
      >
        {listening ? t("voiceStop") : t("voiceStart")}
      </button>
      {status && <p className="text-sm ks-muted">{status}</p>}
    </div>
  );
}
