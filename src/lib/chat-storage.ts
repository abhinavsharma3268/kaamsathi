import type { ChatConversation, ChatMessage } from "./chat-types";

const KEY = "saath.chat.v1";
const MAX_CONVERSATIONS = 20;
const MAX_MESSAGES = 40;

function safeParse(raw: string | null): ChatConversation[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChatConversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) => c && typeof c.id === "string" && Array.isArray(c.messages),
    );
  } catch {
    return [];
  }
}

export function loadConversations(): ChatConversation[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(KEY)).sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1,
  );
}

export function saveConversations(list: ChatConversation[]): void {
  if (typeof window === "undefined") return;
  const trimmed = list.slice(0, MAX_CONVERSATIONS).map((c) => ({
    ...c,
    messages: c.messages.slice(-MAX_MESSAGES),
    // Never persist huge pasted documents long-term in title/body beyond messages cap
  }));
  localStorage.setItem(KEY, JSON.stringify(trimmed));
}

export function upsertConversation(convo: ChatConversation): void {
  const list = loadConversations().filter((c) => c.id !== convo.id);
  list.unshift(convo);
  saveConversations(list);
}

export function getConversation(id: string): ChatConversation | null {
  return loadConversations().find((c) => c.id === id) || null;
}

export function deleteConversation(id: string): void {
  saveConversations(loadConversations().filter((c) => c.id !== id));
}

export function newConversationId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}`;
}

export function titleFromMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 48 ? `${t.slice(0, 48)}…` : t || "Saath chat";
}

export function makeUserMessage(content: string): ChatMessage {
  return {
    id: newConversationId(),
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };
}

export function makeAssistantMessage(
  content: string,
  result?: ChatMessage["result"],
): ChatMessage {
  return {
    id: newConversationId(),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    result,
  };
}
