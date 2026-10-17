import type { Lang } from "./i18n";
import type { ChatHistoryItem, ChatIntent, ChatResult } from "./chat-types";

export type ChatClientOk = { ok: true; result: ChatResult };
export type ChatClientErr = { ok: false; error: string; code?: string };

export async function callChat(args: {
  lang: Lang;
  message: string;
  history?: ChatHistoryItem[];
  forcedIntent?: ChatIntent;
  signal?: AbortSignal;
}): Promise<ChatClientOk | ChatClientErr> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: args.lang,
        message: args.message,
        history: args.history?.slice(-6),
        forcedIntent: args.forcedIntent,
      }),
      signal: args.signal,
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
