import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { GEMINI_TIMEOUT_MS, getGeminiConfig } from "./ai";
import {
  COMPLAINT_PORTAL_IDS,
  COMPLAINT_PORTALS,
  getComplaintPortal,
  isComplaintPortalId,
  portalDirectoryForPrompt,
  type ComplaintPortal,
  type ComplaintPortalId,
  type IssueCategory,
} from "./complaint-portals";
import type { Lang } from "./i18n";
import {
  PROMPT_INJECTION_POLICY,
  detectInjection,
  sanitizeUserText,
  wrapUntrusted,
} from "./prompt-guard";

export const OrganisationTypeSchema = z.enum([
  "private_employer",
  "gig_platform",
  "contractor",
  "government_department",
  "welfare_board",
  "other",
  "unknown",
]);

export type OrganisationType = z.infer<typeof OrganisationTypeSchema>;

export const ComplaintFactsSchema = z.object({
  complaint: z.string().min(1).max(8000),
  occupation: z.string().max(200).optional(),
  state: z.string().max(120).optional(),
  district: z.string().max(120).optional(),
  organisationType: OrganisationTypeSchema.optional(),
  organisationName: z.string().max(200).optional(),
  contactedOrganisation: z.boolean().nullable().optional(),
  /** After the worker answers a follow-up, force a final helpful report */
  forceResolve: z.boolean().optional(),
  followUpRound: z.number().int().min(0).max(5).optional(),
});

export type ComplaintFacts = z.infer<typeof ComplaintFactsSchema>;

export const ComplaintPortalAiSchema = z.object({
  status: z.enum(["needs_information", "recommendation", "manual_assistance"]),
  issueCategory: z.enum([
    "wage_employment_dispute",
    "gig_platform_payment",
    "eshram_service",
    "government_service",
    "punjab_gov_service",
    "safety_emergency",
    "unclear",
    "other",
  ]),
  summary: z.string().min(1),
  missingInformation: z.array(z.string()).optional(),
  followUpQuestion: z.string().optional(),
  recommendedPortalId: z.string().nullable().optional(),
  alternativePortalIds: z.array(z.string()).optional(),
  reason: z.string().optional(),
  eligibilityCaveat: z.string().optional(),
  preparationChecklist: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  isEmergency: z.boolean().optional(),
  copyableSummary: z.string().optional(),
  /** Calm, easy report for the worker */
  workerReport: z.string().optional(),
  /** Short message they can copy/paste to employer or portal */
  draftedMessage: z.string().optional(),
});

export type ComplaintPortalAi = z.infer<typeof ComplaintPortalAiSchema>;

export type ComplaintPortalResult = {
  status: "needs_information" | "recommendation" | "manual_assistance";
  issueCategory: IssueCategory;
  summary: string;
  missingInformation: string[];
  followUpQuestion?: string;
  recommendedPortal: ComplaintPortal | null;
  alternativePortals: ComplaintPortal[];
  reason: string;
  eligibilityCaveat: string;
  preparationChecklist: string[];
  nextSteps: string[];
  officialSources: { title: string; url: string }[];
  confidence: "low" | "medium" | "high";
  isEmergency: boolean;
  copyableSummary: string;
  workerReport: string;
  draftedMessage: string;
  disclaimer: string;
  meta: {
    generatedBy: "gemini+rules";
    injectionFlagged: boolean;
  };
};

export function inferOrganisationType(
  facts: ComplaintFacts,
): OrganisationType {
  if (facts.organisationType && facts.organisationType !== "unknown") {
    return facts.organisationType;
  }
  const text = `${facts.complaint} ${facts.organisationName || ""}`.toLowerCase();
  if (/swiggy|zomato|uber|ola|rapido|blinkit|porter|dunzo|platform|gig app/.test(text)) {
    return "gig_platform";
  }
  if (/e-?\s*shram|eshram/.test(text)) return "government_department";
  if (/government|govt|ration|labour office|cpgrams|municipality/.test(text)) {
    return "government_department";
  }
  if (/contractor|thekedar/.test(text)) return "contractor";
  if (
    /private employer|employer|workplace|factory|shop|office|mistreat|harass|abuse|wages?|salary|unpaid/.test(
      text,
    )
  ) {
    return "private_employer";
  }
  return facts.organisationType || "unknown";
}

function defaultWorkerReport(
  facts: ComplaintFacts,
  category: IssueCategory,
  portal: ComplaintPortal | null,
): string {
  const bits = [
    "Thank you for sharing what happened. Take a slow breath — you are not alone, and we will take this one step at a time.",
    `From what you wrote, this looks related to: ${category.replace(/_/g, " ")}.`,
  ];
  if (portal) {
    bits.push(
      `A possible official website to check is ${portal.displayName}. Open the link yourself and read it carefully. Saath does not submit anything for you.`,
    );
  } else {
    bits.push(
      "We could not safely pick one exact portal. Below you will find official labour links and a short message you can copy.",
    );
  }
  bits.push("You can edit the draft message before you send it.");
  return bits.join(" ");
}

function defaultDraftedMessage(facts: ComplaintFacts): string {
  const what = sanitizeUserText(facts.complaint, 800);
  return [
    "Respected Sir/Madam,",
    "",
    "I work as a worker and I want to share a problem calmly.",
    "",
    what,
    "",
    "Please look into this and tell me the next step. I am ready to share dates and other details if needed.",
    "",
    "Thank you.",
  ].join("\n");
}

function languageInstruction(lang: Lang): string {
  if (lang === "hi")
    return "Respond in clear, short Hindi (Devanagari). Everyday words only.";
  if (lang === "pa")
    return "Respond in clear, short Punjabi (Gurmukhi). Everyday words only.";
  return "Respond in clear, short English. Everyday words only.";
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("INVALID_MODEL_RESPONSE");
    return JSON.parse(match[0]);
  }
}

function filterPortalIds(ids: unknown): ComplaintPortalId[] {
  if (!Array.isArray(ids)) return [];
  const out: ComplaintPortalId[] = [];
  for (const id of ids) {
    if (isComplaintPortalId(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

function isPunjab(state?: string): boolean {
  if (!state) return false;
  const s = state.trim().toLowerCase();
  return s === "punjab" || s === "pb" || s.includes("punjab") || s.includes("ਪੰਜਾਬ");
}

/**
 * Deterministic safety layer on top of Gemini classification.
 * Enforces directory-only IDs and known routing caveats from acceptance criteria.
 */
export function finalizeComplaintRouting(
  ai: ComplaintPortalAi,
  facts: ComplaintFacts,
): Omit<ComplaintPortalResult, "meta"> {
  const disclaimer =
    "Guidance only — not legal advice. Saath never submits your complaint. We only show clear official website links; you open the link and file it yourself.";

  const forceResolve = Boolean(
    facts.forceResolve || (facts.followUpRound && facts.followUpRound >= 1),
  );

  if (ai.isEmergency || ai.issueCategory === "safety_emergency") {
    return {
      status: "manual_assistance",
      issueCategory: "safety_emergency",
      summary: ai.summary,
      missingInformation: [],
      followUpQuestion: undefined,
      recommendedPortal: null,
      alternativePortals: [],
      reason:
        "This sounds like a safety or emergency situation. Use Safety Help and official emergency numbers first.",
      eligibilityCaveat: "Do not use a grievance portal instead of emergency help.",
      preparationChecklist: [],
      nextSteps: [
        "Open Safety Help in Saath",
        "If in danger now: Police 112/100 · Ambulance 108/102",
        "After you are safe, you can return here for grievance routing",
      ],
      officialSources: [],
      confidence: "high",
      isEmergency: true,
      copyableSummary: "",
      workerReport:
        ai.workerReport ||
        "Please stay safe first. Open Safety Help. We can find complaint links after you are safe.",
      draftedMessage: ai.draftedMessage || "",
      disclaimer,
    };
  }

  const org = inferOrganisationType(facts);
  let category = ai.issueCategory;
  let status = ai.status;
  let recommended = isComplaintPortalId(ai.recommendedPortalId)
    ? ai.recommendedPortalId
    : null;
  let alternatives = filterPortalIds(ai.alternativePortalIds);
  let confidence = ai.confidence || "low";
  let missing = [...(ai.missingInformation || [])];
  let followUp = ai.followUpQuestion?.trim() || undefined;

  // Workplace mistreatment / unfair hours often maps to private employer disputes
  if (
    /mistreat|harass|abuse|proper time|overtime|extra hours|not given proper/i.test(
      facts.complaint,
    ) &&
    (category === "unclear" || category === "other")
  ) {
    category = "wage_employment_dispute";
  }

  // Hard rule: gig platform payment disputes are NOT auto-SAMADHAN eligible.
  if (
    org === "gig_platform" ||
    category === "gig_platform_payment" ||
    /swiggy|zomato|uber|ola|rapido|blinkit|porter|dunzo/i.test(
      `${facts.complaint} ${facts.organisationName || ""}`,
    )
  ) {
    if (category === "wage_employment_dispute" || category === "unclear") {
      category = "gig_platform_payment";
    }
    if (recommended === "samadhan") {
      recommended = null;
      status = "manual_assistance";
      confidence = "low";
    }
    alternatives = alternatives.filter((id) => id !== "samadhan");
  }

  // Hard rule: e-Shram service problems → e-Shram GMS
  if (
    category === "eshram_service" ||
    /e-?\s*shram|eshram|ई-?\s*श्रम|ਈ-?\s*ਸ਼੍ਰਮ/i.test(facts.complaint)
  ) {
    category = "eshram_service";
    if (status !== "needs_information") {
      recommended = "eshram_gms";
      status = "recommendation";
      confidence = confidence === "low" ? "medium" : confidence;
      alternatives = alternatives.filter((id) => id !== "eshram_gms");
    }
  }

  // Hard rule: government department → CPGRAMS (or Punjab Connect)
  // Do not override e-Shram service routing.
  if (
    category !== "eshram_service" &&
    (org === "government_department" ||
      category === "government_service" ||
      category === "punjab_gov_service")
  ) {
    if (category !== "punjab_gov_service") category = "government_service";
    if (isPunjab(facts.state) || category === "punjab_gov_service") {
      category = "punjab_gov_service";
      if (status !== "needs_information") {
        recommended = "punjab_connect";
        status = "recommendation";
        alternatives = [
          "cpgrams",
          ...alternatives.filter((id) => id !== "punjab_connect" && id !== "cpgrams"),
        ];
      }
    } else if (status !== "needs_information") {
      recommended = "cpgrams";
      status = "recommendation";
      alternatives = alternatives.filter((id) => id !== "cpgrams");
    }
  }

  // Punjab gov service without org typed still prefers Punjab Connect
  if (category === "punjab_gov_service" && status !== "needs_information") {
    recommended = "punjab_connect";
    status = "recommendation";
  }

  // Wage dispute with private employer/contractor may consider SAMADHAN — with caveats
  if (
    category === "wage_employment_dispute" &&
    (org === "private_employer" || org === "contractor") &&
    status !== "needs_information" &&
    !recommended
  ) {
    recommended = "samadhan";
    status = "recommendation";
    confidence = "medium";
  }

  // Ask for missing routing facts only on the first pass — never loop forever
  if (!forceResolve && (status === "recommendation" || status === "needs_information")) {
    const needOrg = org === "unknown";
    const needState =
      (category === "government_service" ||
        category === "punjab_gov_service") &&
      !facts.state?.trim();

    if (needOrg && !followUp) {
      status = "needs_information";
      recommended = null;
      missing = Array.from(new Set([...missing, "organisationType"]));
      followUp =
        "Who is involved — a gig app/platform, private employer, contractor, or a government office?";
    } else if (needState && category !== "eshram_service" && !followUp) {
      status = "needs_information";
      recommended = null;
      missing = Array.from(new Set([...missing, "state"]));
      followUp = "Which state do you work in?";
    }
  }

  // After a follow-up answer: always produce a final report (no more questions)
  if (forceResolve && status === "needs_information") {
    if (
      category === "wage_employment_dispute" &&
      (org === "private_employer" || org === "contractor")
    ) {
      recommended = "samadhan";
      status = "recommendation";
      confidence = "medium";
    } else if (category === "eshram_service") {
      recommended = "eshram_gms";
      status = "recommendation";
    } else if (org === "government_department") {
      recommended = isPunjab(facts.state) ? "punjab_connect" : "cpgrams";
      status = "recommendation";
    } else {
      status = "manual_assistance";
      recommended = null;
    }
    followUp = undefined;
  }

  // Low confidence without a solid match → manual assistance
  if (
    status === "recommendation" &&
    (!recommended || confidence === "low") &&
    category !== "eshram_service"
  ) {
    if (!recommended) {
      status = "manual_assistance";
    }
  }

  // Drop any invented IDs again
  if (recommended && !isComplaintPortalId(recommended)) recommended = null;
  alternatives = filterPortalIds(alternatives).filter((id) => id !== recommended);

  // Hard stop: never ask again after a follow-up answer
  if (forceResolve && status === "needs_information") {
    status = "manual_assistance";
    followUp = undefined;
    recommended = null;
  }

  if (status === "needs_information") {
    return {
      status,
      issueCategory: category,
      summary: ai.summary,
      missingInformation: missing,
      followUpQuestion:
        followUp ||
        "Please share one more detail so we can suggest the right official portal.",
      recommendedPortal: null,
      alternativePortals: [],
      reason: ai.reason || "We need a little more information before suggesting a portal.",
      eligibilityCaveat:
        ai.eligibilityCaveat ||
        "We will not guess a portal. Wrong portals waste time.",
      preparationChecklist: ai.preparationChecklist || [],
      nextSteps: ai.nextSteps || ["Answer the question below", "Or edit your complaint and try again"],
      officialSources: [],
      confidence: "low",
      isEmergency: false,
      copyableSummary: "",
      workerReport: "",
      draftedMessage: "",
      disclaimer,
    };
  }

  if (status === "recommendation" && recommended) {
    const portal = getComplaintPortal(recommended);
    const alts = alternatives.map(getComplaintPortal);
    const sources = [
      ...portal.trustedSourceUrls,
      ...alts.flatMap((p) => p.trustedSourceUrls),
    ].filter(
      (s, i, arr) => arr.findIndex((x) => x.url === s.url) === i,
    );
    const workerReport =
      ai.workerReport?.trim() || defaultWorkerReport(facts, category, portal);
    const draftedMessage =
      ai.draftedMessage?.trim() || defaultDraftedMessage(facts);

    return {
      status: "recommendation",
      issueCategory: category,
      summary: ai.summary,
      missingInformation: missing,
      recommendedPortal: portal,
      alternativePortals: alts,
      reason:
        ai.reason ||
        `${portal.displayName} may be relevant based on the details you shared.`,
      eligibilityCaveat:
        ai.eligibilityCaveat ||
        `${portal.whoMayUse} ${portal.exclusions}`,
      preparationChecklist:
        ai.preparationChecklist?.length
          ? ai.preparationChecklist
          : portal.requiredDocuments,
      nextSteps:
        ai.nextSteps?.length
          ? ai.nextSteps
          : [
              "Tap the official link below (or copy the URL)",
              "Read the portal’s own eligibility text on that website",
              "If you file anything, do it only on that official site — never inside Saath",
            ],
      officialSources: sources,
      confidence,
      isEmergency: false,
      copyableSummary:
        ai.copyableSummary ||
        buildCopyableSummary(facts, category),
      workerReport,
      draftedMessage,
      disclaimer,
    };
  }

  // manual_assistance default
  const manualPortal = null;
  return {
    status: "manual_assistance",
    issueCategory: category,
    summary: ai.summary,
    missingInformation: missing,
    recommendedPortal: null,
    alternativePortals: filterPortalIds(alternatives).map(getComplaintPortal),
    reason:
      ai.reason ||
      "We cannot safely pick one portal from the verified list with the details given.",
    eligibilityCaveat:
      ai.eligibilityCaveat ||
      "You can draft a complaint letter in Saath, or check the Ministry of Labour site and your state labour department through official pages.",
    preparationChecklist: ai.preparationChecklist || [
      "Write dates, amounts, and who is involved",
      "Keep screenshots of payments or messages",
    ],
    nextSteps: ai.nextSteps || [
      "Use Write a Complaint in Saath for a letter draft",
      "Check https://labour.gov.in/ for labour department links",
      "If it is an e-Shram account issue, use the e-Shram grievance system",
    ],
    officialSources: [
      { title: "Ministry of Labour & Employment", url: "https://labour.gov.in/" },
      { title: "e-Shram", url: "https://eshram.gov.in/" },
    ],
    confidence: "low",
    isEmergency: false,
    copyableSummary: ai.copyableSummary || buildCopyableSummary(facts, category),
    workerReport:
      ai.workerReport?.trim() || defaultWorkerReport(facts, category, manualPortal),
    draftedMessage: ai.draftedMessage?.trim() || defaultDraftedMessage(facts),
    disclaimer,
  };
}

export function buildCopyableSummary(
  facts: ComplaintFacts,
  category: IssueCategory,
): string {
  const lines = [
    "Complaint summary (for official website — edit before sending):",
    `Issue type: ${category}`,
    `What happened: ${sanitizeUserText(facts.complaint, 1500)}`,
  ];
  if (facts.occupation) lines.push(`Occupation: ${facts.occupation}`);
  if (facts.state) lines.push(`State: ${facts.state}`);
  if (facts.district) lines.push(`District: ${facts.district}`);
  if (facts.organisationType)
    lines.push(`Organisation type: ${facts.organisationType}`);
  if (facts.organisationName)
    lines.push(`Organisation name: ${sanitizeUserText(facts.organisationName, 200)}`);
  if (facts.contactedOrganisation != null)
    lines.push(
      `Already contacted organisation: ${facts.contactedOrganisation ? "yes" : "no"}`,
    );
  lines.push(
    "Note: Do not paste Aadhaar, bank passwords, or OTPs into this summary.",
  );
  return lines.join("\n");
}

export async function runComplaintPortalAi(args: {
  lang: Lang;
  facts: ComplaintFacts;
}): Promise<ComplaintPortalAi> {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) throw new Error("MISSING_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  const forceResolve = Boolean(
    args.facts.forceResolve ||
      (args.facts.followUpRound && args.facts.followUpRound >= 1),
  );

  const schema = `{
  "status": "needs_information" | "recommendation" | "manual_assistance",
  "issueCategory": one of ${JSON.stringify([
    "wage_employment_dispute",
    "gig_platform_payment",
    "eshram_service",
    "government_service",
    "punjab_gov_service",
    "safety_emergency",
    "unclear",
    "other",
  ])},
  "summary": string,
  "missingInformation": string[],
  "followUpQuestion": string (if needs_information),
  "recommendedPortalId": one of ${JSON.stringify([...COMPLAINT_PORTAL_IDS])} or null,
  "alternativePortalIds": string[] (IDs only from the list),
  "reason": string,
  "eligibilityCaveat": string,
  "preparationChecklist": string[],
  "nextSteps": string[],
  "confidence": "low" | "medium" | "high",
  "isEmergency": boolean,
  "copyableSummary": string,
  "workerReport": string (calm, easy, short paragraphs for the worker),
  "draftedMessage": string (short polite message the worker can copy)
}`;

  const system = `
You are Saath complaint-portal router for Indian workers.
${PROMPT_INJECTION_POLICY}
Rules:
- Guidance only. Never say a complaint was filed or will succeed.
- Never invent portal URLs or portal IDs. Use ONLY this directory:
${portalDirectoryForPrompt()}
- Gig platform payment disputes must NOT be declared automatically eligible for SAMADHAN.
- e-Shram registration/service problems → eshram_gms.
- Government department/public service grievances → cpgrams; if Punjab government service → punjab_connect.
- Private industrial/wage disputes may consider samadhan with strong eligibility caveats.
- Workplace mistreatment, unfair hours, unpaid effort, harassment by a private employer → wage_employment_dispute; prefer samadhan with caveats when forceResolve is true.
- If unsure, use status needs_information or manual_assistance.
- Ask at most ONE short follow-up question, and only on the first pass.
- When facts.forceResolve is true OR followUpRound >= 1: NEVER use needs_information. Always return recommendation or manual_assistance, plus workerReport and draftedMessage.
- workerReport: talk like Saath sitting with them. Mention the facts they filled (what happened, occupation, state, organisation name) in everyday words. 3–5 short sentences. Do not sound scary or legalistic.
- draftedMessage: a short respectful message they can paste to employer/HR or into a portal form. Include what happened in plain words. No threats.
- Never ask for Aadhaar, bank passwords, or OTPs.
`.trim();

  const user = [
    languageInstruction(args.lang),
    forceResolve
      ? "FORCE FINAL REPORT: Do not ask another question. Give workerReport, draftedMessage, and the best portal you can."
      : "If one short clarification would help a lot, you may ask it once.",
    `Return JSON only matching: ${schema}`,
    wrapUntrusted("COMPLAINT_FACTS", JSON.stringify(args.facts, null, 2)),
  ].join("\n\n");

  let result;
  try {
    result = await generativeModel.generateContent(
      { contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }] },
      { timeout: GEMINI_TIMEOUT_MS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/timeout|abort|deadline/i.test(msg)) throw new Error("AI_TIMEOUT");
    throw new Error("AI_PROVIDER_ERROR");
  }
  const text = result.response.text();
  if (!text?.trim()) throw new Error("EMPTY_MODEL_RESPONSE");
  let json: unknown;
  try {
    json = extractJson(text);
  } catch {
    throw new Error("INVALID_MODEL_RESPONSE");
  }
  const parsed = ComplaintPortalAiSchema.safeParse(json);
  if (!parsed.success) throw new Error("INVALID_MODEL_RESPONSE");
  return parsed.data;
}

export async function routeComplaintPortal(args: {
  lang: Lang;
  facts: ComplaintFacts;
}): Promise<ComplaintPortalResult> {
  const facts: ComplaintFacts = {
    ...args.facts,
    complaint: sanitizeUserText(args.facts.complaint, 8000),
    occupation: args.facts.occupation
      ? sanitizeUserText(args.facts.occupation, 200)
      : undefined,
    state: args.facts.state
      ? sanitizeUserText(args.facts.state, 120)
      : undefined,
    district: args.facts.district
      ? sanitizeUserText(args.facts.district, 120)
      : undefined,
    organisationName: args.facts.organisationName
      ? sanitizeUserText(args.facts.organisationName, 200)
      : undefined,
  };

  const injection = detectInjection(facts.complaint);
  const ai = await runComplaintPortalAi({ lang: args.lang, facts });
  const finalized = finalizeComplaintRouting(ai, facts);
  return {
    ...finalized,
    meta: {
      generatedBy: "gemini+rules",
      injectionFlagged: injection.flagged,
    },
  };
}

/** Exported for tests — directory snapshot */
export function listPortalIds(): ComplaintPortalId[] {
  return [...COMPLAINT_PORTAL_IDS];
}

export { COMPLAINT_PORTALS };
