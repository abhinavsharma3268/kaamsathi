import type { Lang } from "./i18n";
import type { ComplaintFacts, ComplaintPortalResult } from "./complaint-router";

export type ComplaintPortalClientOk = { ok: true } & ComplaintPortalResult;
export type ComplaintPortalClientErr = {
  ok: false;
  error: string;
  code?: string;
};

export async function callComplaintPortal(args: {
  lang: Lang;
  facts: ComplaintFacts;
}): Promise<ComplaintPortalClientOk | ComplaintPortalClientErr> {
  try {
    const res = await fetch("/api/complaint-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || "Request failed.",
        code: data.code,
      };
    }
    return { ok: true, ...data };
  } catch {
    return {
      ok: false,
      error:
        "Network error while finding a portal. No substitute recommendation was shown.",
      code: "NETWORK",
    };
  }
}
