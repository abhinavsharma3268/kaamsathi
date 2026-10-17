import type { Lang } from "./i18n";
import type { AiModule } from "./ai";
import type { HowToGuide, HowToTopicId } from "./show-me-how";
import { profileAiContext } from "./occupations";
import { loadProfile } from "./storage";

export type AiClientResult = {
  ok: true;
  answer: string;
  simpleAnswer?: string;
  nextSteps?: string[];
  disclaimer?: string;
  sources?: { title: string; url: string }[];
  isEmergency?: boolean;
  draft?: string;
  explanation?: string;
  steps?: string[];
  materials?: string[];
  warnings?: string[];
  nextAction?: string;
  visualIds?: string[];
  howTo?: HowToGuide;
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
    const profile = loadProfile();
    const workerProfile = profileAiContext({
      primary: profile.primaryOccupation,
      additional: profile.additionalOccupations,
      language: args.lang,
    });
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...args,
        payload: {
          ...(args.payload || {}),
          workerProfile,
        },
      }),
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
      simpleAnswer: data.simpleAnswer,
      nextSteps: data.nextSteps,
      disclaimer: data.disclaimer,
      sources: data.sources,
      isEmergency: data.isEmergency,
      draft: data.draft,
      explanation: data.explanation,
      steps: data.steps,
      materials: data.materials,
      warnings: data.warnings,
      nextAction: data.nextAction,
      visualIds: data.visualIds,
      howTo: data.howTo,
    };
  } catch {
    return {
      ok: false,
      error:
        "Network error while contacting the assistant. No substitute answer was shown.",
      code: "NETWORK",
    };
  }
}

export async function callShowMeHow(args: {
  topicId: HowToTopicId;
  lang: Lang;
  message?: string;
  context?: Record<string, unknown>;
}): Promise<AiClientResult | AiClientError> {
  return callAi({
    module: "show_me_how",
    lang: args.lang,
    message: args.message,
    payload: {
      topicId: args.topicId,
      ...(args.context || {}),
    },
  });
}
