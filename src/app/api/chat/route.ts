import { NextResponse } from "next/server";
import { z } from "zod";
import { runChatTurn } from "@/lib/chat-orchestrator";
import { ChatIntentSchema, ChatKindSchema } from "@/lib/chat-types";
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
        content: z.string().max(4000),
        intent: ChatIntentSchema.optional(),
        kind: ChatKindSchema.optional(),
      }),
    )
    .max(12)
    .optional(),
  forcedIntent: ChatIntentSchema.optional(),
  formAnswers: z.record(z.string().max(40), z.string().max(2000)).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const message = sanitizeUserText(parsed.data.message, 8000);
  if (!message.trim()) {
    return NextResponse.json(
      { error: "Please enter a message.", code: "EMPTY_MESSAGE" },
      { status: 400 },
    );
  }

  try {
    const result = await runChatTurn({
      lang: parsed.data.lang,
      message,
      history: parsed.data.history?.map((h) => ({
        role: h.role,
        content: sanitizeUserText(h.content, 4000),
        intent: h.intent,
        kind: h.kind,
      })),
      forcedIntent: parsed.data.forcedIntent,
      formAnswers: parsed.data.formAnswers,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "MISSING_API_KEY") {
      return NextResponse.json(
        {
          error:
            "Assistant unavailable: GEMINI_API_KEY is not configured on the server.",
          code: "MISSING_API_KEY",
        },
        { status: 503 },
      );
    }
    console.error("[chat]", msg);
    return NextResponse.json(
      {
        error:
          "The assistant could not complete this request. Please try again.",
        code: "AI_FAILED",
        detail: msg,
      },
      { status: 502 },
    );
  }
}
