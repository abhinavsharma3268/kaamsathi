import { detectSmallTalk, needsDetailForm } from "./chat-persona";
import type { ChatIntent } from "./chat-types";

/**
 * Decision engine for the chosen vertical:
 * Informal / gig-worker support in India (delivery, driving, daily wage).
 *
 * One function, one next step. Easy to test, easy to explain to judges.
 */
export type ChatDecision =
  | { type: "small_talk"; key: "greeting" | "thanks" }
  | { type: "talk_and_form"; intent: ChatIntent; reason: string }
  | { type: "help"; intent: ChatIntent; reason: string };

export function decideNextStep(args: {
  intent: ChatIntent;
  facts: string;
  asked: number;
  formSubmitted: boolean;
  isEmergency: boolean;
  latestMessage: string;
  continuing: boolean;
  forcedIntent?: ChatIntent;
}): ChatDecision {
  const { intent } = args;

  // Life-safety always wins: skip forms, give help now.
  if (args.isEmergency) {
    return { type: "help", intent: "safety", reason: "emergency_override" };
  }

  // Greetings stay cheap and stable — no model, no form.
  const small = detectSmallTalk(args.latestMessage);
  if (small && !args.continuing && !args.formSubmitted && !args.forcedIntent) {
    return { type: "small_talk", key: small };
  }

  // Missing facts: Gemini talks about what they said, then a short form.
  if (
    needsDetailForm({
      intent,
      facts: args.facts,
      asked: args.asked,
      formSubmitted: args.formSubmitted,
      isEmergency: false,
    })
  ) {
    return {
      type: "talk_and_form",
      intent,
      reason: `missing_slots:${intent}`,
    };
  }

  return { type: "help", intent, reason: "enough_context" };
}
