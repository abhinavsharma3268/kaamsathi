import { z } from "zod";
import { runChatTurn } from "@/lib/chat-orchestrator";
import { ChatIntentSchema, ChatKindSchema } from "@/lib/chat-types";
import {
  aiErrorResponse,
  enforceRateLimit,
  jsonNoStore,
  logAiFailure,
  readJsonBody,
  safeError,
  withTimeout,
} from "@/lib/api-guard";
import { GEMINI_TIMEOUT_MS } from "@/lib/ai";
import { sanitizeUserText } from "@/lib/prompt-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  lang: z.enum(["en", "hi", "pa"]),
  message: z.string().min(1).max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
        intent: ChatIntentSchema.optional(),
        kind: ChatKindSchema.optional(),
      }),
    )
    .max(8)
    .optional(),
  forcedIntent: ChatIntentSchema.optional(),
  formAnswers: z.record(z.string().max(40), z.string().max(2000)).optional(),
  workerProfile: z
    .object({
      primaryOccupationId: z.string().max(40).optional(),
      primaryOccupation: z.string().max(120).optional(),
      additionalOccupations: z.array(z.string().max(120)).max(4).optional(),
      language: z.string().max(8).optional(),
      displayName: z.string().max(60).optional(),
      gender: z.string().max(40).optional(),
      privacyNote: z.string().max(400).optional(),
      guidanceRules: z.array(z.string().max(240)).max(8).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, {
    scope: "chat",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const body = await readJsonBody(req, 120_000);
  if (!body.ok) return body.response;

  const parsed = BodySchema.safeParse(body.data);
  if (!parsed.success) {
    return safeError("BAD_REQUEST", "Invalid request.", 400);
  }

  const message = sanitizeUserText(parsed.data.message, 8000);
  if (!message.trim()) {
    return safeError("EMPTY_MESSAGE", "Please enter a message.", 400);
  }

  try {
    const result = await withTimeout(
      runChatTurn({
        lang: parsed.data.lang,
        message,
        history: parsed.data.history?.map((h) => ({
          role: h.role,
          content: sanitizeUserText(h.content, 2000),
          intent: h.intent,
          kind: h.kind,
        })),
        forcedIntent: parsed.data.forcedIntent,
        formAnswers: parsed.data.formAnswers,
        workerProfile: parsed.data.workerProfile,
      }),
      GEMINI_TIMEOUT_MS + 8_000,
    );
    return jsonNoStore({ ok: true, result });
  } catch (err) {
    logAiFailure("chat", err);
    return aiErrorResponse(
      err,
      "The assistant could not complete this request. Please try again.",
    );
  }
}
