import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { getGeminiConfig, runAi } from "./ai";
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

  const historyBlob = args.history
    .slice(-4)
    .map((h) => `${h.role}: ${h.content}`)
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

  const result = await m.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
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

function earningsFollowUp(lang: Lang): string {
  if (lang === "hi")
    return "कमाई जोड़ने के लिए लिखें: कुल कमाई ₹…, बोनस ₹…, घंटे …, पेट्रोल ₹…";
  if (lang === "pa")
    return "ਕਮਾਈ ਲਈ ਲਿਖੋ: ਕੁੱਲ ਕਮਾਈ ₹…, ਬੋਨਸ ₹…, ਘੰਟੇ …, ਪੈਟਰੋਲ ₹…";
  return "To calculate, tell me: gross pay ₹…, bonus ₹…, hours …, fuel ₹…";
}

function documentsFollowUp(lang: Lang): string {
  if (lang === "hi")
    return "पेस्लिप या नोटिस का टेक्स्ट यहाँ पेस्ट करें। मैं आसान भाषा में समझाऊँगा।";
  if (lang === "pa")
    return "ਪੇਸਲਿਪ ਜਾਂ ਨੋਟਿਸ ਦਾ ਟੈਕਸਟ ਇੱਥੇ ਪੇਸਟ ਕਰੋ। ਮੈਂ ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸਮਝਾਵਾਂਗਾ।";
  return "Paste the payslip or notice text here. I will explain it in simple words.";
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
      text: "Please tell me what happened.",
    };
  }

  const injection = detectInjection(message);
  const history = (args.history || []).slice(-6);
  const local = inferIntentLocal(message);
  let intent: ChatIntent = args.forcedIntent || local.intent;
  let followUp: string | undefined;
  let generalReply: string | undefined;

  // Only call Gemini classify when local confidence is low and no forced intent
  if (!args.forcedIntent && local.confidence === "low") {
    try {
      const classified = await classifyWithGemini({
        lang: args.lang,
        message,
        history,
      });
      intent = classified.intent;
      if (classified.needsFollowUp && classified.followUpQuestion?.trim()) {
        followUp = classified.followUpQuestion.trim();
      }
      if (classified.intent === "general" && classified.reply?.trim()) {
        generalReply = classified.reply.trim();
      }
    } catch {
      // Fall through with local/general
      intent = local.intent === "general" ? "general" : local.intent;
    }
  }

  if (local.isEmergency) {
    intent = "safety";
  }

  if (followUp && intent !== "safety") {
    return {
      kind: "follow_up",
      intent,
      text: followUp,
      followUpQuestion: followUp,
    };
  }

  if (intent === "earnings") {
    const nums = extractEarningsNumbers(message);
    if (nums.gross == null && nums.hours == null) {
      return {
        kind: "follow_up",
        intent: "earnings",
        text: earningsFollowUp(args.lang),
        followUpQuestion: earningsFollowUp(args.lang),
        deepLink: "/earnings",
      };
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
    const text =
      args.lang === "hi"
        ? `हिसाब (ऐप ने जोड़ा): नेट ₹${net}${input.hours ? ` · ₹${perHour}/घंटा` : ""}. Saath ने यह आंकड़े खुद गिने — अनुमान नहीं।`
        : args.lang === "pa"
          ? `ਹਿਸਾਬ (ਐਪ ਨੇ ਜੋੜਿਆ): ਨੈੱਟ ₹${net}${input.hours ? ` · ₹${perHour}/ਘੰਟਾ` : ""}. Saath ਨੇ ਇਹ ਅੰਕ ਖੁਦ ਗਿਣੇ — ਅਨੁਮਾਨ ਨਹੀਂ।`
          : `Calculated in the app: net ₹${net}${input.hours ? ` · ₹${perHour}/hour` : ""}. These numbers are app math — not a guess.`;
    return {
      kind: "earnings",
      intent: "earnings",
      text,
      simpleAnswer: text,
      earnings: { ...input, net, perHour },
      deepLink: "/earnings",
      nextSteps: [
        args.lang === "hi"
          ? "पूरी हिस्ट्री के लिए कमाई पेज खोलें"
          : args.lang === "pa"
            ? "ਪੂਰੀ ਹਿਸਟਰੀ ਲਈ ਕਮਾਈ ਪੰਨਾ ਖੋਲ੍ਹੋ"
            : "Open Earnings to save today’s entry",
      ],
    };
  }

  if (intent === "documents") {
    // Need substantial pasted text to explain; otherwise ask
    if (message.length < 40 && !/\d/.test(message)) {
      return {
        kind: "follow_up",
        intent: "documents",
        text: documentsFollowUp(args.lang),
        followUpQuestion: documentsFollowUp(args.lang),
        deepLink: "/documents",
      };
    }
    const ai = await runAi({
      module: "documents",
      lang: args.lang,
      message,
      payload: { documentText: message },
    });
    return {
      kind: "documents",
      intent: "documents",
      text: ai.simpleAnswer || ai.answer,
      simpleAnswer: ai.simpleAnswer,
      nextSteps: ai.nextSteps,
      disclaimer: ai.disclaimer,
      sources: ai.sources,
      deepLink: "/documents",
    };
  }

  if (intent === "complaint_portal") {
    const portal = await routeComplaintPortal({
      lang: args.lang,
      facts: {
        complaint: message,
        forceResolve: history.some((h) => h.role === "user"),
        followUpRound: history.filter((h) => h.role === "user").length >= 1 ? 1 : 0,
      },
    });
    if (portal.status === "needs_information" && portal.followUpQuestion) {
      return {
        kind: "follow_up",
        intent: "complaint_portal",
        text: portal.followUpQuestion,
        followUpQuestion: portal.followUpQuestion,
        simpleAnswer: portal.summary,
      };
    }
    return {
      kind: "portal",
      intent: "complaint_portal",
      text:
        portal.workerReport ||
        portal.summary ||
        portal.reason ||
        "Here is guidance on official complaint websites.",
      simpleAnswer: portal.summary,
      nextSteps: portal.nextSteps,
      disclaimer: portal.disclaimer,
      portal,
      draft: portal.draftedMessage || undefined,
      deepLink: "/complaint-portal",
    };
  }

  if (intent === "grievance") {
    const ai = await runAi({
      module: "grievance",
      lang: args.lang,
      message,
      payload: { issue: message },
    });
    return {
      kind: "grievance",
      intent: "grievance",
      text: ai.simpleAnswer || ai.answer,
      simpleAnswer: ai.simpleAnswer,
      draft: ai.draft,
      nextSteps: ai.nextSteps,
      disclaimer:
        ai.disclaimer ||
        "Saath does not send this letter. You can copy and send it yourself.",
      deepLink: "/grievance",
    };
  }

  if (intent === "safety" || intent === "rights") {
    const ai = await runAi({
      module: intent,
      lang: args.lang,
      message,
    });
    return {
      kind: intent,
      intent,
      text: ai.simpleAnswer || ai.answer,
      simpleAnswer: ai.simpleAnswer,
      nextSteps: ai.nextSteps,
      disclaimer: ai.disclaimer,
      sources: ai.sources,
      isEmergency: Boolean(ai.isEmergency || local.isEmergency),
      deepLink: intent === "safety" ? "/safety" : "/rights",
    };
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

  const ai = await runAi({
    module: "rights",
    lang: args.lang,
    message: `The worker said: ${message}. Give short practical next steps. If unclear, ask one follow-up. Do not invent schemes or eligibility.`,
  });
  return {
    kind: "message",
    intent: "general",
    text: ai.simpleAnswer || ai.answer,
    simpleAnswer: ai.simpleAnswer,
    nextSteps: ai.nextSteps,
    disclaimer: ai.disclaimer,
    sources: ai.sources,
  };
}
