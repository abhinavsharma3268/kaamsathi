import type { Lang } from "./i18n";
import type { ChatFormAnswers, ChatHistoryItem, ChatIntent, ChatResult } from "./chat-types";
import { fetchJsonNoStore } from "./client-fetch";
import { profileAiContext } from "./occupations";
import { loadProfile } from "./storage";

export type ChatClientOk = { ok: true; result: ChatResult };
export type ChatClientErr = { ok: false; error: string; code?: string };

export async function callChat(args: {
  lang: Lang;
  message: string;
  history?: ChatHistoryItem[];
  forcedIntent?: ChatIntent;
  formAnswers?: ChatFormAnswers;
  signal?: AbortSignal;
}): Promise<ChatClientOk | ChatClientErr> {
  try {
    const profile = loadProfile();
    const workerProfile = profileAiContext({
      primary: profile.primaryOccupation,
      additional: profile.additionalOccupations,
      language: args.lang,
      displayName: profile.displayName,
      gender: profile.gender,
    });
    const history = (args.history || [])
      .slice(-6)
      .map((h) => ({
        ...h,
        content: h.content.slice(0, 1500),
      }));
    const res = await fetchJsonNoStore({
      url: "/api/chat",
      body: {
        lang: args.lang,
        message: args.message.slice(0, 8000),
        history,
        forcedIntent: args.forcedIntent,
        formAnswers: args.formAnswers,
        workerProfile,
      },
      signal: args.signal,
      timeoutMs: 50_000,
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || "Chat request failed.",
        code: data.code,
      };
    }
    return { ok: true, result: data.result as ChatResult };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "Cancelled.", code: "ABORTED" };
    }
    return {
      ok: false,
      error: "Network error. Please try again.",
      code: "NETWORK",
    };
  }
}
