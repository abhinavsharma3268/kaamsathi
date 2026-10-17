/**
 * Show Me How — curated topics + verified local illustrations.
 * Visual URLs are only served from this allowlist (never invented by the model).
 */

export type HowToTopicId =
  | "wage_deductions"
  | "prepare_grievance"
  | "welfare_schemes"
  | "safety_guidance";

export type HowToVisual = {
  id: string;
  src: string;
  altEn: string;
  captionEn: string;
};

export type HowToTopic = {
  id: HowToTopicId;
  module: "documents" | "grievance" | "rights" | "safety";
  defaultPrompt: string;
  visualIds: string[];
  officialSourceIds?: string[];
};

export const HOWTO_VISUALS: Record<string, HowToVisual> = {
  "payslip-annotated": {
    id: "payslip-annotated",
    src: "/howto/payslip-annotated.svg",
    altEn: "Sample payslip diagram with gross, deductions, and net labels",
    captionEn: "Example payment paper — check gross, cuts, and net on your real slip",
  },
  "complaint-steps": {
    id: "complaint-steps",
    src: "/howto/complaint-steps.svg",
    altEn: "Four steps to write and send a complaint yourself",
    captionEn: "Write facts → check letter → open email → you press Send",
  },
  "welfare-check": {
    id: "welfare-check",
    src: "/howto/welfare-check.svg",
    altEn: "Checklist for checking a government scheme on official sites",
    captionEn: "Use official websites only. Never assume you are eligible.",
  },
  "safety-rest": {
    id: "safety-rest",
    src: "/howto/safety-rest.svg",
    altEn: "Stop safely, rest, and call emergency numbers if hurt",
    captionEn: "Picture is guidance only — call 112/100 or 108 if in danger",
  },
};

export const HOWTO_TOPICS: Record<HowToTopicId, HowToTopic> = {
  wage_deductions: {
    id: "wage_deductions",
    module: "documents",
    defaultPrompt:
      "Show me how to understand unexpected wage deductions on a payslip or payout message. Use short steps. Do not invent my amounts.",
    visualIds: ["payslip-annotated"],
  },
  prepare_grievance: {
    id: "prepare_grievance",
    module: "grievance",
    defaultPrompt:
      "Show me how to prepare a respectful complaint about unpaid wages or unfair deductions. Explain steps and what papers help. Do not claim the complaint was submitted.",
    visualIds: ["complaint-steps"],
  },
  welfare_schemes: {
    id: "welfare_schemes",
    module: "rights",
    defaultPrompt:
      "Show me how to find and check government welfare schemes useful for gig or daily-wage workers. Never say I am eligible. Prefer official portals.",
    visualIds: ["welfare-check"],
    officialSourceIds: ["eShram", "pmjay", "labour-code", "esic", "india-gov"],
  },
  safety_guidance: {
    id: "safety_guidance",
    module: "safety",
    defaultPrompt:
      "Show me how to stay safer when I feel sleepy while driving for work. Give practical steps. For emergencies, tell me to call official numbers only.",
    visualIds: ["safety-rest"],
  },
};

export const HOWTO_TOPIC_IDS = Object.keys(HOWTO_TOPICS) as HowToTopicId[];

export function isHowToTopicId(value: unknown): value is HowToTopicId {
  return typeof value === "string" && value in HOWTO_TOPICS;
}

/** Only return visuals from the curated allowlist. Unknown IDs are dropped. */
export function resolveHowToVisuals(
  ids: string[] | undefined,
  topicId: HowToTopicId,
): HowToVisual[] {
  const topic = HOWTO_TOPICS[topicId];
  const requested = ids && ids.length > 0 ? ids : topic.visualIds;
  const seen = new Set<string>();
  const out: HowToVisual[] = [];
  for (const id of requested) {
    if (seen.has(id)) continue;
    const visual = HOWTO_VISUALS[id];
    if (!visual) continue;
    seen.add(id);
    out.push(visual);
  }
  if (out.length === 0) {
    for (const id of topic.visualIds) {
      const visual = HOWTO_VISUALS[id];
      if (visual) out.push(visual);
    }
  }
  return out;
}

export type HowToGuide = {
  explanation: string;
  steps: string[];
  materials: string[];
  warnings: string[];
  nextAction: string;
  visuals: HowToVisual[];
  topicId: HowToTopicId;
};

export function buildHowToGuide(args: {
  topicId: HowToTopicId;
  explanation: string;
  steps?: string[];
  materials?: string[];
  warnings?: string[];
  nextAction?: string;
  visualIds?: string[];
  fallbackAnswer?: string;
}): HowToGuide {
  const explanation =
    args.explanation.trim() ||
    args.fallbackAnswer?.trim() ||
    "Follow the steps below. If anything is unclear, check an official source.";

  return {
    topicId: args.topicId,
    explanation,
    steps: (args.steps || []).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    materials: (args.materials || []).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    warnings: (args.warnings || []).map((s) => s.trim()).filter(Boolean).slice(0, 6),
    nextAction: (args.nextAction || "").trim(),
    visuals: resolveHowToVisuals(args.visualIds, args.topicId),
  };
}

/** Plain text for optional browser text-to-speech (caller must check support). */
export function howToSpeechText(guide: HowToGuide): string {
  const parts = [guide.explanation];
  if (guide.steps.length) {
    parts.push(
      "Steps: " +
        guide.steps.map((s, i) => `${i + 1}. ${s}`).join(" "),
    );
  }
  if (guide.materials.length) {
    parts.push("You may need: " + guide.materials.join(". "));
  }
  if (guide.warnings.length) {
    parts.push("Important: " + guide.warnings.join(". "));
  }
  if (guide.nextAction) {
    parts.push("Next: " + guide.nextAction);
  }
  return parts.join("\n\n");
}

export function canUseSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
