import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { sourcesForPrompt } from "./welfare-sources";
import type { Lang } from "./i18n";

export type AiModule =
  | "earnings_explain"
  | "safety"
  | "rights"
  | "documents"
  | "grievance";

export type AiRequest = {
  module: AiModule;
  lang: Lang;
  message?: string;
  payload?: Record<string, unknown>;
};

const ResponseSchema = z.object({
  answer: z.string().min(1),
  disclaimer: z.string().optional(),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url().or(z.string().startsWith("https://")),
      }),
    )
    .optional(),
  isEmergency: z.boolean().optional(),
  draft: z.string().optional(),
});

export type AiStructured = z.infer<typeof ResponseSchema>;

export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
  return { apiKey: apiKey || null, model };
}

export function isAiConfigured(): boolean {
  return Boolean(getGeminiConfig().apiKey);
}

function languageInstruction(lang: Lang): string {
  if (lang === "hi")
    return "Respond entirely in clear, professional Hindi (Devanagari). Use short sentences a worker can follow easily.";
  if (lang === "pa")
    return "Respond entirely in clear, professional Punjabi (Gurmukhi). Use short sentences a worker can follow easily.";
  return "Respond entirely in clear, professional English. Use short sentences suitable for limited digital literacy.";
}

function systemFor(module: AiModule): string {
  const common = `
You are KaamSaathi, a professional work-guidance assistant for Indian gig and informal workers
(delivery partners, drivers, daily-wage workers).

Rules:
- Be practical, respectful, calm, and clear. Avoid slang and exaggerated claims.
- Never invent laws, eligibility, phone numbers, or document contents.
- Never claim a benefit is guaranteed.
- Distinguish facts from suggestions.
- If unsure, say so clearly and suggest checking official sources.
- Do not give dangerous advice.
- Return ONLY valid JSON matching the schema described by the user message.
`.trim();

  if (module === "safety") {
    return `${common}
Safety focus: road safety, fatigue, accidents, workplace safety.
For emergencies (injury, assault, fire, ongoing crime): set isEmergency=true,
tell the user to call official emergency numbers (Police 112/100, Ambulance 108/102,
Women Helpline 1091, Cyber Crime 1930). Do not invent other emergency numbers.`;
  }

  if (module === "rights") {
    return `${common}
Rights & welfare focus. Prefer these sources when relevant:
${sourcesForPrompt()}

Never declare the worker eligible. Explain typical documents and steps as general information only.
Include relevant sources in the sources array with real URLs from the list above when possible.`;
  }

  if (module === "documents") {
    return `${common}
Document helper: explain ONLY text that was provided. Extract amounts, dates, deductions, and next steps from the provided content.
If the content is empty or unreadable, say so. Never invent document fields.`;
  }

  if (module === "grievance") {
    return `${common}
Draft a respectful complaint letter/message using ONLY the facts provided by the user.
Do not claim it was submitted. Put the full editable draft in the "draft" field and a short tip in "answer".`;
  }

  return `${common}
Earnings coach: the numeric totals given to you are CALCULATED FACTS. Do not recalculate incorrectly.
Explain trends and give practical expense-awareness suggestions. Label suggestions as suggestions.`;
}

function buildUserPrompt(req: AiRequest): string {
  const schema = `{
  "answer": string (required, main response),
  "disclaimer": string (optional),
  "sources": [{"title": string, "url": string}] (optional),
  "isEmergency": boolean (optional, safety module),
  "draft": string (optional, grievance module full letter)
}`;

  return [
    languageInstruction(req.lang),
    `Module: ${req.module}`,
    `Return JSON only, matching: ${schema}`,
    req.message ? `User message:\n${req.message}` : "",
    req.payload ? `Structured data:\n${JSON.stringify(req.payload, null, 2)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
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
    if (!match) throw new Error("Model did not return JSON.");
    return JSON.parse(match[0]);
  }
}

export async function runAi(req: AiRequest): Promise<AiStructured> {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    const err = new Error("MISSING_API_KEY");
    throw err;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  const result = await generativeModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemFor(req.module)}\n\n${buildUserPrompt(req)}` }],
      },
    ],
  });

  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("EMPTY_MODEL_RESPONSE");
  }

  const parsed = ResponseSchema.safeParse(extractJson(text));
  if (!parsed.success) {
    throw new Error("INVALID_MODEL_RESPONSE");
  }
  return parsed.data;
}
