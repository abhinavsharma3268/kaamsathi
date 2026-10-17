import { NextResponse } from "next/server";
import { z } from "zod";
import { runAi, type AiModule } from "@/lib/ai";
import { detectInjection, sanitizeUserText } from "@/lib/prompt-guard";
import { extractDocumentEntities } from "@/lib/document-extract";
import {
  HOWTO_TOPICS,
  buildHowToGuide,
  isHowToTopicId,
} from "@/lib/show-me-how";
import { WELFARE_SOURCES } from "@/lib/welfare-sources";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  module: z.enum([
    "earnings_explain",
    "safety",
    "rights",
    "documents",
    "grievance",
    "show_me_how",
  ]),
  lang: z.enum(["en", "hi", "pa"]),
  message: z.string().max(20000).optional(),
  payload: z.record(z.unknown()).optional(),
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
      { error: "Invalid request.", code: "BAD_REQUEST", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { module, lang } = parsed.data;
  const message = parsed.data.message
    ? sanitizeUserText(parsed.data.message)
    : undefined;
  let payload = parsed.data.payload
    ? ({ ...parsed.data.payload } as Record<string, unknown>)
    : undefined;

  if (
    (module === "safety" || module === "rights") &&
    !message?.trim()
  ) {
    return NextResponse.json(
      { error: "Please enter your question.", code: "EMPTY_MESSAGE" },
      { status: 400 },
    );
  }

  if (module === "documents") {
    const text = sanitizeUserText(
      String(payload?.documentText ?? message ?? ""),
    );
    if (!text) {
      return NextResponse.json(
        {
          error: "No document text was provided for explanation.",
          code: "EMPTY_DOCUMENT",
        },
        { status: 400 },
      );
    }
    // Structured extraction happens in application code before the LLM call.
    const structuredEntities =
      payload?.structuredEntities ?? extractDocumentEntities(text);
    payload = {
      ...(payload || {}),
      documentText: text,
      structuredEntities,
    };
  }

  if (module === "grievance") {
    const issue = sanitizeUserText(String(payload?.issue ?? ""), 4000);
    if (!issue) {
      return NextResponse.json(
        { error: "Please describe the issue.", code: "EMPTY_ISSUE" },
        { status: 400 },
      );
    }
    payload = { ...(payload || {}), issue };
  }

  let howToMessage = message;
  if (module === "show_me_how") {
    const topicId = payload?.topicId;
    if (!isHowToTopicId(topicId)) {
      return NextResponse.json(
        {
          error: "Choose a valid Show Me How topic.",
          code: "INVALID_HOWTO_TOPIC",
        },
        { status: 400 },
      );
    }
    const topic = HOWTO_TOPICS[topicId];
    howToMessage = sanitizeUserText(
      (message && message.trim()) || topic.defaultPrompt,
      4000,
    );
    const preferredSources = (topic.officialSourceIds || [])
      .map((id) => WELFARE_SOURCES.find((s) => s.id === id))
      .flatMap((s) =>
        s ? [{ title: s.title, url: s.url, notes: s.notes }] : [],
      );
    payload = {
      ...(payload || {}),
      topicId,
      relatedModule: topic.module,
      curatedVisualIds: topic.visualIds,
      preferredOfficialSources: preferredSources,
      instruction:
        "Return structured how-to fields. Prefer preferredOfficialSources for welfare. Never invent image URLs.",
    };
  }

  const injectionCheck = detectInjection(
    [howToMessage, payload ? JSON.stringify(payload) : ""]
      .filter(Boolean)
      .join("\n"),
  );

  try {
    const result = await runAi({
      module: module as AiModule,
      lang,
      message: howToMessage,
      payload,
    });

    const howTo =
      module === "show_me_how" && isHowToTopicId(payload?.topicId)
        ? buildHowToGuide({
            topicId: payload.topicId,
            explanation: result.explanation || result.simpleAnswer || result.answer,
            steps: result.steps || result.nextSteps,
            materials: result.materials,
            warnings: result.warnings,
            nextAction: result.nextAction,
            visualIds: result.visualIds,
            fallbackAnswer: result.answer,
          })
        : undefined;

    return NextResponse.json({
      ok: true,
      ...result,
      howTo,
      meta: {
        generatedBy: "gemini",
        kind: module === "show_me_how" ? "show_me_how" : "ai",
        promptGuard: {
          injectionFlagged: injectionCheck.flagged,
          hits: injectionCheck.hits.slice(0, 5),
        },
        structuredEntities:
          module === "documents" ? payload?.structuredEntities : undefined,
        visualsCurated: Boolean(howTo),
      },
    });
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
    console.error("[ai]", msg);
    return NextResponse.json(
      {
        error:
          "The assistant could not complete this request. No substitute answer was shown. Please try again.",
        code: "AI_FAILED",
        detail: msg,
      },
      { status: 502 },
    );
  }
}
