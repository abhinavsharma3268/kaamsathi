import type { Lang } from "./i18n";
import type { AiModule } from "./ai";

export type AiClientResult = {
  ok: true;
  answer: string;
  disclaimer?: string;
  sources?: { title: string; url: string }[];
  isEmergency?: boolean;
  draft?: string;
};

export type AiClientError = {
  ok: false;
  error: string;
  code?: string;
};

export async function callAi(args: {
  module: AiModule;
  lang: Lang;
  message?: string;
  payload?: Record<string, unknown>;
}): Promise<AiClientResult | AiClientError> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || "AI request failed.",
        code: data.code,
      };
    }
    return {
      ok: true,
      answer: data.answer,
      disclaimer: data.disclaimer,
      sources: data.sources,
      isEmergency: data.isEmergency,
      draft: data.draft,
    };
  } catch {
    return {
      ok: false,
      error: "Network error while contacting AI. No fake answer was shown.",
      code: "NETWORK",
    };
  }
}
