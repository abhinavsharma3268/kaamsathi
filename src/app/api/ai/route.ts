import { z } from "zod";
import { runAi, type AiModule, GEMINI_TIMEOUT_MS } from "@/lib/ai";
import {
  aiErrorResponse,
  enforceRateLimit,
  jsonNoStore,
  logAiFailure,
  readJsonBody,
  safeError,
  withTimeout,
} from "@/lib/api-guard";
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
  message: z.string().max(12000).optional(),
  payload: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, {
    scope: "ai",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const body = await readJsonBody(req, 200_000);
  if (!body.ok) return body.response;

  const parsed = BodySchema.safeParse(body.data);
  if (!parsed.success) {
    return safeError("BAD_REQUEST", "Invalid request.", 400);
  }

  const { module, lang } = parsed.data;
  const message = parsed.data.message
    ? sanitizeUserText(parsed.data.message, 8000)
    : undefined;
  let payload = parsed.data.payload
    ? ({ ...parsed.data.payload } as Record<string, unknown>)
    : undefined;

  if ((module === "safety" || module === "rights") && !message?.trim()) {
    return safeError("EMPTY_MESSAGE", "Please enter your question.", 400);
  }

  if (module === "documents") {
    const text = sanitizeUserText(
      String(payload?.documentText ?? message ?? ""),
      8000,
    );
    if (!text) {
      return safeError(
        "EMPTY_DOCUMENT",
        "No document text was provided for explanation.",
        400,
      );
    }
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
      return safeError("EMPTY_ISSUE", "Please describe the issue.", 400);
    }
    payload = { ...(payload || {}), issue };
  }

  let howToMessage = message;
  if (module === "show_me_how") {
    const topicId = payload?.topicId;
    if (!isHowToTopicId(topicId)) {
      return safeError(
        "INVALID_HOWTO_TOPIC",
        "Choose a valid Show Me How topic.",
        400,
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
    [howToMessage, payload ? JSON.stringify(payload).slice(0, 4000) : ""]
      .filter(Boolean)
      .join("\n"),
  );

  try {
    const result = await withTimeout(
      runAi({
        module: module as AiModule,
        lang,
        message: howToMessage,
        payload,
      }),
      GEMINI_TIMEOUT_MS + 5_000,
    );

    const howTo =
      module === "show_me_how" && isHowToTopicId(payload?.topicId)
        ? buildHowToGuide({
            topicId: payload.topicId,
            explanation:
              result.explanation || result.simpleAnswer || result.answer,
            steps: result.steps || result.nextSteps,
            materials: result.materials,
            warnings: result.warnings,
            nextAction: result.nextAction,
            visualIds: result.visualIds,
            fallbackAnswer: result.answer,
          })
        : undefined;

    return jsonNoStore({
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
    logAiFailure("ai", err);
    return aiErrorResponse(
      err,
      "The assistant could not complete this request. No substitute answer was shown. Please try again.",
    );
  }
}
