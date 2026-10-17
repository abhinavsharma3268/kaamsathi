import { z } from "zod";
import {
  ComplaintFactsSchema,
  routeComplaintPortal,
} from "@/lib/complaint-router";
import { isTrustedPortalUrl } from "@/lib/complaint-portals";
import { GEMINI_TIMEOUT_MS } from "@/lib/ai";
import {
  aiErrorResponse,
  enforceRateLimit,
  jsonNoStore,
  logAiFailure,
  readJsonBody,
  safeError,
  withTimeout,
} from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  lang: z.enum(["en", "hi", "pa"]),
  facts: ComplaintFactsSchema,
});

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, {
    scope: "complaint-portal",
    limit: 15,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const body = await readJsonBody(req, 80_000);
  if (!body.ok) return body.response;

  const parsed = BodySchema.safeParse(body.data);
  if (!parsed.success) {
    return safeError(
      "BAD_REQUEST",
      "Invalid request. Please describe what happened.",
      400,
    );
  }

  if (!parsed.data.facts.complaint.trim()) {
    return safeError("EMPTY_COMPLAINT", "Please write what happened.", 400);
  }

  try {
    const result = await withTimeout(
      routeComplaintPortal(parsed.data),
      GEMINI_TIMEOUT_MS + 5_000,
    );
    if (
      result.recommendedPortal &&
      !isTrustedPortalUrl(result.recommendedPortal.officialUrl)
    ) {
      return safeError(
        "UNTRUSTED_PORTAL",
        "Portal validation failed. No substitute link was shown.",
        502,
      );
    }
    return jsonNoStore({ ok: true, ...result });
  } catch (err) {
    logAiFailure("complaint-portal", err);
    return aiErrorResponse(
      err,
      "Could not find a complaint portal right now. No invented recommendation was shown. Please try again.",
    );
  }
}
