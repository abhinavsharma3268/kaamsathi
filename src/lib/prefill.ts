/** Cross-page workflow prefill (local only, cleared after read). */

export type PrefillPayload = {
  module: "safety" | "rights" | "documents" | "grievance" | "earnings";
  value: string;
  field?: "issue" | "question" | "document";
};

const KEY = "kaamsaathi.prefill.v1";

export function setPrefill(payload: PrefillPayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function consumePrefill(
  module: PrefillPayload["module"],
): PrefillPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrefillPayload;
    if (parsed.module !== module) return null;
    sessionStorage.removeItem(KEY);
    return parsed;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}
