import { NextResponse } from "next/server";
import { z } from "zod";
import { runAi, type AiModule } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  module: z.enum([
    "earnings_explain",
    "safety",
    "rights",
    "documents",
    "grievance",
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

  const { module, lang, message, payload } = parsed.data;

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
    const text = String(payload?.documentText ?? message ?? "").trim();
    if (!text) {
      return NextResponse.json(
        {
          error: "No document text was provided for explanation.",
          code: "EMPTY_DOCUMENT",
        },
        { status: 400 },
      );
    }
  }

  if (module === "grievance") {
    const issue = String(payload?.issue ?? "").trim();
    if (!issue) {
      return NextResponse.json(
        { error: "Please describe the issue.", code: "EMPTY_ISSUE" },
        { status: 400 },
      );
    }
  }

  try {
    const result = await runAi({
      module: module as AiModule,
      lang,
      message,
      payload,
    });
    return NextResponse.json({
      ok: true,
      ...result,
      meta: { generatedBy: "gemini", kind: "ai" },
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
