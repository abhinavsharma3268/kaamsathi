import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { GEMINI_TIMEOUT_MS, getGeminiConfig, runAi } from "./ai";
import {
  extractEarningsNumbers,
  inferIntentLocal,
} from "./chat-intent";
import {
  ChatIntentSchema,
  type ChatHistoryItem,
  type ChatIntent,
  type ChatResult,
} from "./chat-types";
import {
  PERSONA_PROMPT,
  detectSmallTalk,
  earningsText,
  missingDetailQuestion,
  phrase,
  resolveThread,
} from "./chat-persona";
import { routeComplaintPortal } from "./complaint-router";
import { computeEarnings } from "./earnings";
import type { Lang } from "./i18n";
import {
  PROMPT_INJECTION_POLICY,
  detectInjection,
  sanitizeUserText,
  wrapUntrusted,
} from "./prompt-guard";

const ClassifySchema = z.object({
  intent: ChatIntentSchema,
  followUpQuestion: z.string().optional(),
  needsFollowUp: z.boolean().optional(),
  reply: z.string().optional(),
});

function langLine(lang: Lang): string {
  if (lang === "hi") return "Write worker-facing text in short Hindi (Devanagari).";
  if (lang === "pa") return "Write worker-facing text in short Punjabi (Gurmukhi).";
  return "Write worker-facing text in short clear English.";
}

async function classifyWithGemini(args: {
  lang: Lang;
  message: string;
  history: ChatHistoryItem[];
}): Promise<z.infer<typeof ClassifySchema>> {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) throw new Error("MISSING_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 400,
      responseMimeType: "application/json",
    },
  });

  // Send only a compact recent context: last 4 turns, each trimmed.
  const historyBlob = args.history
    .slice(-4)
    .map((h) => `${h.role}: ${sanitizeUserText(h.content, 400)}`)
    .join("\n");

  const prompt = `
You are Saath intent router for Indian workers.
${PROMPT_INJECTION_POLICY}
${langLine(args.lang)}
Return JSON only:
{
  "intent": "safety"|"rights"|"documents"|"grievance"|"complaint_portal"|"earnings"|"general",
  "needsFollowUp": boolean,
  "followUpQuestion": string (one short question if needsFollowUp),
  "reply": string (only when intent is general — short helpful reply)
}
${PERSONA_PROMPT}
Rules:
- Prefer complaint_portal when they ask where to file/submit a complaint.
- Prefer grievance when they want a letter/draft written.
- Prefer documents when they paste or ask to explain a payslip/notice.
- Prefer safety for danger, fatigue, accidents. Emergency → safety.
- Prefer earnings for pay calc / today's money math.
- Prefer rights for schemes, e-Shram, insurance, worker rights.
- Ask at most ONE follow-up. Never invent URLs or say a complaint was filed.
- You are not a lawyer or government official.

${historyBlob ? wrapUntrusted("RECENT_CHAT", historyBlob) : ""}
${wrapUntrusted("USER_MESSAGE", args.message)}
`.trim();

  let result;
  try {
    result = await m.generateContent(
      { contents: [{ role: "user", parts: [{ text: prompt }] }] },
      { timeout: GEMINI_TIMEOUT_MS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/timeout|abort|deadline/i.test(msg)) throw new Error("AI_TIMEOUT");
    throw new Error("AI_PROVIDER_ERROR");
  }
  const text = result.response.text();
  if (!text?.trim()) throw new Error("EMPTY_MODEL_RESPONSE");
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("INVALID_MODEL_RESPONSE");
    json = JSON.parse(match[0]);
  }
  const parsed = ClassifySchema.safeParse(json);
  if (!parsed.success) throw new Error("INVALID_MODEL_RESPONSE");
  return parsed.data;
}

function ask(intent: ChatIntent, question: string, deepLink?: string): ChatResult {
  return {
    kind: "follow_up",
    intent,
    text: question,
    followUpQuestion: question,
    deepLink,
  };
}

export async function runChatTurn(args: {
  lang: Lang;
  message: string;
  history?: ChatHistoryItem[];
  forcedIntent?: ChatIntent;
}): Promise<ChatResult> {
  const message = sanitizeUserText(args.message, 8000);
  if (!message.trim()) {
    return {
      kind: "error",
      intent: "general",
      text: phrase("emptyMessage", args.lang),
    };
  }

  const injection = detectInjection(message);
  const history = (args.history || []).slice(-8);
  const local = inferIntentLocal(message);

  // Greetings / thanks: answer in Saath's own voice, no model call.
  const lastAssistant = [...history].reverse().find((h) => h.role === "assistant");
  const smallTalk = detectSmallTalk(message);
  if (!args.forcedIntent && smallTalk && lastAssistant?.kind !== "follow_up") {
    const text = phrase(smallTalk, args.lang);
    return { kind: "message", intent: "general", text, simpleAnswer: text };
  }

  // Which topic are we on? If Saath just asked a question, this is the answer.
  const thread = resolveThread({
    history,
    message,
    localIntent: local.intent,
    localConfidence: local.confidence,
    isEmergency: local.isEmergency,
    forcedIntent: args.forcedIntent,
  });
  let intent: ChatIntent = thread.intent;
  const continuing = thread.asked > 0;
  let generalReply: string | undefined;

  // Only call Gemini to classify when the topic is genuinely unclear.
  if (!args.forcedIntent && !continuing && local.confidence === "low") {
    try {
      const classified = await classifyWithGemini({
        lang: args.lang,
        message,
        history,
      });
      intent = classified.intent;
      if (classified.intent === "general" && classified.reply?.trim()) {
        generalReply = classified.reply.trim();
      }
    } catch {
      intent = local.intent;
    }
    thread.intent = intent;
  }

  if (local.isEmergency) {
    intent = "safety";
    thread.intent = "safety";
  }

  // Ask for missing essentials (one question at a time) before doing the work.
  if (!local.isEmergency) {
    const question = missingDetailQuestion(thread, args.lang);
    if (question) return ask(intent, question);
  }

  // Everything the worker has told us in this thread.
  const facts = sanitizeUserText(thread.facts, 8000);
  const ack = continuing ? phrase("gotDetails", args.lang) : "";

  if (intent === "earnings") {
    const nums = extractEarningsNumbers(facts);
    if (nums.gross == null && nums.hours == null) {
      return ask("earnings", phrase("askEarnings", args.lang), "/earnings");
    }
    const input = {
      date: new Date().toISOString().slice(0, 10),
      gross: nums.gross ?? 0,
      incentives: nums.incentives ?? 0,
      hours: nums.hours ?? 0,
      fuel: nums.fuel ?? 0,
      maintenance: nums.maintenance ?? 0,
      otherExpenses: nums.otherExpenses ?? 0,
    };
    const { net, perHour } = computeEarnings(input);
    const text = ack + earningsText(args.lang, net, perHour, input.hours);
    return {
      kind: "earnings",
      intent: "earnings",
      text,
      simpleAnswer: text,
      earnings: { ...input, net, perHour },
      deepLink: "/earnings",
      nextSteps: [phrase("earningsStep", args.lang)],
    };
  }

  if (intent === "documents") {
    // Need substantial pasted text to explain; otherwise ask
    if (message.length < 40 && !/\d/.test(message)) {
      return ask("documents", phrase("askDocument", args.lang), "/documents");
    }
    const docText = sanitizeUserText(message, 6000);
    try {
      const ai = await runAi({
        module: "documents",
        lang: args.lang,
        message: "Explain this work-related document in simple language.",
        payload: { documentText: docText },
      });
      return {
        kind: "documents",
        intent: "documents",
        text: ack + (ai.simpleAnswer || ai.answer),
        simpleAnswer: ai.simpleAnswer,
        nextSteps: ai.nextSteps,
        disclaimer: ai.disclaimer,
        sources: ai.sources,
        deepLink: "/documents",
      };
    } catch {
      return ask("documents", phrase("askDocument", args.lang), "/documents");
    }
  }

  if (intent === "complaint_portal") {
    try {
      const portal = await routeComplaintPortal({
        lang: args.lang,
        facts: {
          complaint: facts,
          forceResolve: true,
          followUpRound: thread.asked,
        },
      });
      if (portal.status === "needs_information" && portal.followUpQuestion) {
        return ask("complaint_portal", portal.followUpQuestion);
      }
      return {
        kind: "portal",
        intent: "complaint_portal",
        text:
          ack +
          (portal.workerReport ||
            portal.summary ||
            portal.reason ||
            phrase("portalFallback", args.lang)),
        simpleAnswer: portal.summary,
        nextSteps: portal.nextSteps,
        disclaimer: portal.disclaimer,
        portal,
        draft: portal.draftedMessage || undefined,
        deepLink: "/complaint-portal",
      };
    } catch {
      return {
        kind: "portal",
        intent: "complaint_portal",
        text: ack + phrase("portalFallback", args.lang),
        deepLink: "/complaint-portal",
      };
    }
  }

  if (intent === "grievance") {
    try {
      const ai = await runAi({
        module: "grievance",
        lang: args.lang,
        message: facts,
        payload: { issue: facts },
      });
      return {
        kind: "grievance",
        intent: "grievance",
        text: ack + (ai.simpleAnswer || ai.answer),
        simpleAnswer: ai.simpleAnswer,
        draft: ai.draft,
        nextSteps: ai.nextSteps,
        disclaimer: ai.disclaimer || phrase("grievanceDisclaimer", args.lang),
        deepLink: "/grievance",
      };
    } catch {
      return {
        kind: "grievance",
        intent: "grievance",
        text: ack + phrase("grievanceDisclaimer", args.lang),
        deepLink: "/grievance",
      };
    }
  }

  if (intent === "safety" || intent === "rights") {
    try {
      const ai = await runAi({
        module: intent,
        lang: args.lang,
        message: facts,
      });
      return {
        kind: intent,
        intent,
        text: ack + (ai.simpleAnswer || ai.answer),
        simpleAnswer: ai.simpleAnswer,
        nextSteps: ai.nextSteps,
        disclaimer: ai.disclaimer,
        sources: ai.sources,
        isEmergency: Boolean(ai.isEmergency || local.isEmergency),
        deepLink: intent === "safety" ? "/safety" : "/rights",
      };
    } catch {
      return {
        kind: intent,
        intent,
        text: ack + phrase(intent === "safety" ? "askSafety" : "askRights", args.lang),
        deepLink: intent === "safety" ? "/safety" : "/rights",
      };
    }
  }

  // general
  if (generalReply) {
    return {
      kind: "message",
      intent: "general",
      text: generalReply,
      simpleAnswer: generalReply,
      disclaimer: injection.flagged
        ? "Some unusual instructions in your message were ignored."
        : undefined,
    };
  }

  try {
    const ai = await runAi({
      module: "rights",
      lang: args.lang,
      message: `The worker said: ${facts}. Reply as Saath: acknowledge in one line, then give short practical next steps. If something essential is unclear, ask exactly one question. Do not invent schemes or eligibility.`,
    });
    return {
      kind: "message",
      intent: "general",
      text: ack + (ai.simpleAnswer || ai.answer),
      simpleAnswer: ai.simpleAnswer,
      nextSteps: ai.nextSteps,
      disclaimer: ai.disclaimer,
      sources: ai.sources,
    };
  } catch {
    return {
      kind: "follow_up",
      intent: "general",
      text: phrase("emptyMessage", args.lang),
      followUpQuestion: phrase("emptyMessage", args.lang),
    };
  }
}
