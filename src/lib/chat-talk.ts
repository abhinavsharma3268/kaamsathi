import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { GEMINI_TIMEOUT_MS, getGeminiConfig } from "./ai";
import { TALK_PROMPT } from "./chat-persona";
import type { ChatIntent } from "./chat-types";
import type { Lang } from "./i18n";
import { workerProfilePromptBlock } from "./occupations";
import {
  PROMPT_INJECTION_POLICY,
  sanitizeUserText,
  wrapUntrusted,
} from "./prompt-guard";

const TalkSchema = z.object({
  text: z.string().min(1).max(1200),
});

function langLine(lang: Lang): string {
  if (lang === "hi")
    return "Write the reply in short spoken Hindi (Devanagari), like a friend texting.";
  if (lang === "pa")
    return "Write the reply in short spoken Punjabi (Gurmukhi), like a friend texting.";
  return "Write the reply in short spoken English, like a friend texting.";
}

function fallbackTalk(lang: Lang, latest: string): string {
  const clip = latest.trim().slice(0, 80);
  if (lang === "hi")
    return clip
      ? `मैंने सुना — ${clip}। नीचे छोटा फ़ॉर्म भर दें, फिर मैं आपके हिसाब से बताऊँगा।`
      : "मैं सुन रहा हूँ। नीचे छोटा फ़ॉर्म भरें, मैं उसी के हिसाब से मदद करूँगा।";
  if (lang === "pa")
    return clip
      ? `ਮੈਂ ਸੁਣਿਆ — ${clip}। ਹੇਠਾਂ ਛੋਟਾ ਫਾਰਮ ਭਰੋ, ਫਿਰ ਮੈਂ ਤੁਹਾਡੇ ਹਿਸਾਬ ਨਾਲ ਦੱਸਾਂਗਾ।`
      : "ਮੈਂ ਸੁਣ ਰਿਹਾ ਹਾਂ। ਹੇਠਾਂ ਛੋਟਾ ਫਾਰਮ ਭਰੋ, ਮੈਂ ਉਸੇ ਹਿਸਾਬ ਨਾਲ ਮਦਦ ਕਰਾਂਗਾ।";
  return clip
    ? `I hear you — ${clip}. Fill the short form below and I’ll help you from there.`
    : "I’m listening. Fill the short form below and I’ll help you from there.";
}

/** One conversational Gemini turn. Never a canned checklist. */
export async function talkWithGemini(args: {
  lang: Lang;
  intent: ChatIntent;
  latest: string;
  facts: string;
  workerProfile?: Record<string, unknown>;
}): Promise<string> {
  const latest = sanitizeUserText(args.latest, 1500);
  const facts = sanitizeUserText(args.facts, 4000);
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) return fallbackTalk(args.lang, latest);

  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.55,
      maxOutputTokens: 280,
      responseMimeType: "application/json",
    },
  });

  const profileBlock = workerProfilePromptBlock(args.workerProfile);

  const prompt = `
${TALK_PROMPT}
${PROMPT_INJECTION_POLICY}
${langLine(args.lang)}
Topic: ${args.intent}
${profileBlock}
${wrapUntrusted("WHAT_THEY_HAVE_TOLD_YOU", facts)}
${wrapUntrusted("LATEST_MESSAGE", latest)}
`.trim();

  try {
    const result = await m.generateContent(
      { contents: [{ role: "user", parts: [{ text: prompt }] }] },
      { timeout: GEMINI_TIMEOUT_MS },
    );
    const raw = result.response.text() || "";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    let json: unknown;
    try {
      json = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return fallbackTalk(args.lang, latest);
      json = JSON.parse(match[0]);
    }
    const parsed = TalkSchema.safeParse(json);
    if (!parsed.success) return fallbackTalk(args.lang, latest);
    return parsed.data.text.trim();
  } catch {
    return fallbackTalk(args.lang, latest);
  }
}
