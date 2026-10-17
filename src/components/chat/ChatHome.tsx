"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguagePicker } from "@/components/LanguagePicker";
import { VoiceInput } from "@/components/VoiceInput";
import { ChatResultCard } from "@/components/chat/ChatResultCard";
import { ToolsDrawer, ToolsSidebar } from "@/components/chat/ToolsSidebar";
import { useLanguage } from "@/hooks/useLanguage";
import { callChat } from "@/lib/client-chat";
import type { ChatConversation, ChatIntent, ChatMessage } from "@/lib/chat-types";
import {
  deleteConversation,
  getConversation,
  makeAssistantMessage,
  makeUserMessage,
  newConversationId,
  titleFromMessage,
  upsertConversation,
} from "@/lib/chat-storage";

const STARTERS: { key: string; intent?: ChatIntent }[] = [
  { key: "chatStarterPay", intent: "complaint_portal" },
  { key: "chatStarterScheme", intent: "rights" },
  { key: "chatStarterPayslip", intent: "documents" },
  { key: "chatStarterLetter", intent: "grievance" },
  { key: "chatStarterSafety", intent: "safety" },
  { key: "chatStarterEarnings", intent: "earnings" },
];

function SaathAvatar() {
  return (
    <span className="mb-1 shrink-0 overflow-hidden rounded-full">
      <BrandLogo size="xs" className="rounded-full shadow-none" />
    </span>
  );
}

function statusFromResult(kind: string): ChatConversation["status"] {
  if (kind === "grievance" || kind === "portal") return "draft_ready";
  if (kind === "follow_up") return "waiting_user";
  if (kind === "error") return "in_progress";
  return "completed";
}

export function ChatHome({ resumeId }: { resumeId?: string | null }) {
  const { t, lang } = useLanguage();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convoId, setConvoId] = useState(() => newConversationId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [forcedIntent, setForcedIntent] = useState<ChatIntent | undefined>();
  const [toolsOpen, setToolsOpen] = useState(false);
  const closeTools = useCallback(() => setToolsOpen(false), []);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    const existing = getConversation(resumeId);
    if (!existing) return;
    setConvoId(existing.id);
    setMessages(existing.messages);
  }, [resumeId]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const persist = useCallback(
    (id: string, next: ChatMessage[], status: ChatConversation["status"], intent?: ChatIntent) => {
      const firstUser = next.find((m) => m.role === "user");
      const draft = [...next]
        .reverse()
        .find((m) => m.result?.draft)?.result?.draft;
      upsertConversation({
        id,
        title: titleFromMessage(firstUser?.content || t("chatWelcome")),
        createdAt: next[0]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status,
        messages: next,
        savedDraft: draft,
        lastIntent: intent,
      });
    },
    [t],
  );

  const send = useCallback(
    async (raw: string, intent?: ChatIntent) => {
      const text = raw.trim();
      if (!text || loading) return;

      setError(null);
      setInput("");
      setForcedIntent(undefined);
      const userMsg = makeUserMessage(text);
      const pending = [...messages, userMsg];
      setMessages(pending);
      setLoading(true);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      // Error bubbles are not part of the conversation Saath reasons over.
      const history = pending
        .slice(0, -1)
        .filter((m) => m.result?.kind !== "error")
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 4000),
          intent: m.result?.intent,
          kind: m.result?.kind,
        }));

      const res = await callChat({
        lang,
        message: text,
        history,
        forcedIntent: intent || forcedIntent,
        signal: ac.signal,
      });

      if (res.ok === false) {
        if (res.code === "ABORTED") {
          setLoading(false);
          return;
        }
        setLoading(false);
        setError(res.error);
        const errMsg = makeAssistantMessage(t("chatErrorBubble"), {
          kind: "error",
          intent: "general",
          text: t("chatErrorBubble"),
        });
        const withErr = [...pending, errMsg];
        setMessages(withErr);
        persist(convoId, withErr, "in_progress");
        return;
      }

      const assistant = makeAssistantMessage(
        res.result.text || res.result.simpleAnswer || "",
        res.result,
      );
      const next = [...pending, assistant];
      startTransition(() => setMessages(next));
      setLoading(false);
      persist(
        convoId,
        next,
        statusFromResult(res.result.kind),
        res.result.intent,
      );
    },
    [convoId, forcedIntent, lang, loading, messages, persist, t],
  );

  // After Saath asks a question, put the cursor back in the box.
  const lastMsg = messages[messages.length - 1];
  const awaitingAnswer =
    !loading && lastMsg?.role === "assistant" && lastMsg.result?.kind === "follow_up";
  useEffect(() => {
    if (awaitingAnswer) inputRef.current?.focus();
  }, [awaitingAnswer]);

  function onNewChat() {
    abortRef.current?.abort();
    setConvoId(newConversationId());
    setMessages([]);
    setError(null);
    setInput("");
    setForcedIntent(undefined);
  }

  const empty = messages.length === 0;

  const starters = useMemo(() => STARTERS, []);

  return (
    <div className="flex items-start gap-4">
    <div className="flex min-h-[70dvh] min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LanguagePicker />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="lg:hidden">
            <button
              type="button"
              className="ks-btn ks-btn-secondary min-h-11 rounded-2xl px-3 text-sm"
              onClick={() => setToolsOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={toolsOpen}
            >
              ☰ {t("chatTools")}
            </button>
          </span>
          <button
            type="button"
            className="ks-btn ks-btn-secondary min-h-11 rounded-2xl px-3 text-sm"
            onClick={onNewChat}
          >
            {t("chatNew")}
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-2xl bg-white/50 p-3 ring-1 ring-[var(--line)]"
        style={{ maxHeight: "min(62dvh, 600px)", contain: "content" }}
        aria-live="polite"
      >
        {empty && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <BrandLogo size="lg" priority />
            <p className="max-w-sm text-base font-semibold leading-relaxed text-[var(--brand-deep)]">
              {t("chatWelcome")}
            </p>
            <div className="flex w-full flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="ks-btn ks-btn-secondary min-h-11 rounded-2xl px-3 text-left text-sm"
                  onClick={() => void send(t(s.key), s.intent)}
                  disabled={loading}
                >
                  {t(s.key)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && <SaathAvatar />}
            <div
              className={`max-w-[88%] px-3 py-2 text-base leading-relaxed ${
                m.role === "user"
                  ? "rounded-2xl rounded-br-md bg-[var(--brand)] text-white"
                  : "rounded-2xl rounded-bl-md bg-white text-[var(--ink)] ring-1 ring-[var(--line)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.result && m.role === "assistant" && (
                <ChatResultCard result={m.result} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2">
            <SaathAvatar />
            <div
              className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-3 py-2 ring-1 ring-[var(--line)]"
              aria-label={t("chatThinking")}
            >
              <span className="sr-only">{t("chatThinking")}</span>
              <span className="saath-dot" />
              <span className="saath-dot" style={{ animationDelay: "0.15s" }} />
              <span className="saath-dot" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--accent-soft)] px-3 py-2">
          <p className="text-sm font-semibold text-[var(--accent)]">{error}</p>
          <button
            type="button"
            className="ks-btn ks-btn-secondary min-h-10 rounded-xl px-3 text-sm"
            onClick={() => {
              const lastUser = [...messages].reverse().find((m) => m.role === "user");
              if (lastUser) void send(lastUser.content);
            }}
          >
            {t("chatRetry")}
          </button>
        </div>
      )}

      <form
        className="sticky bottom-0 flex items-end gap-2 rounded-2xl bg-white p-2 ring-1 ring-[var(--line)]"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <VoiceInput
          compact
          disabled={loading}
          onTranscript={(text) =>
            setInput((prev) => (prev ? `${prev.trim()} ${text}` : text))
          }
        />
        <label className="sr-only" htmlFor="saath-chat-input">
          {t("chatInputLabel")}
        </label>
        <textarea
          id="saath-chat-input"
          ref={inputRef}
          className="ks-textarea min-h-12 flex-1 resize-none rounded-2xl py-3 text-base"
          rows={2}
          value={input}
          disabled={loading}
          placeholder={awaitingAnswer ? t("chatAnswerPlaceholder") : t("chatPlaceholder")}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <button
          type="submit"
          className="ks-btn ks-btn-primary min-h-12 shrink-0 rounded-2xl px-4 text-base"
          disabled={loading || !input.trim()}
        >
          {t("chatSend")}
        </button>
      </form>

      {messages.length > 0 && (
        <button
          type="button"
          className="text-center text-sm font-semibold text-[var(--ink-muted)] underline"
          onClick={() => {
            deleteConversation(convoId);
            onNewChat();
          }}
        >
          {t("chatClear")}
        </button>
      )}
    </div>

    <ToolsSidebar />
    <ToolsDrawer open={toolsOpen} onClose={closeTools} />
    </div>
  );
}
