import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ComplaintFactsSchema,
  routeComplaintPortal,
} from "@/lib/complaint-router";
import { isTrustedPortalUrl } from "@/lib/complaint-portals";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  lang: z.enum(["en", "hi", "pa"]),
  facts: ComplaintFactsSchema,
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
      {
        error: "Invalid request. Please describe what happened.",
        code: "BAD_REQUEST",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (!parsed.data.facts.complaint.trim()) {
    return NextResponse.json(
      { error: "Please write what happened.", code: "EMPTY_COMPLAINT" },
      { status: 400 },
    );
  }

  try {
    const result = await routeComplaintPortal(parsed.data);
    // Belt-and-suspenders: never return an untrusted URL
    if (
      result.recommendedPortal &&
      !isTrustedPortalUrl(result.recommendedPortal.officialUrl)
    ) {
      return NextResponse.json(
        {
          error: "Portal validation failed. No substitute link was shown.",
          code: "UNTRUSTED_PORTAL",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, ...result });
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
    console.error("[complaint-portal]", msg);
    return NextResponse.json(
      {
        error:
          "Could not find a complaint portal right now. No invented recommendation was shown. Please try again.",
        code: "AI_FAILED",
        detail: msg,
      },
      { status: 502 },
    );
  }
}
