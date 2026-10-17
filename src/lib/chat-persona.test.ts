import { describe, expect, it } from "vitest";
import {
  detectSmallTalk,
  formForIntent,
  formatFormAnswers,
  needsDetailForm,
  phrase,
  resolveThread,
} from "./chat-persona";
import type { ChatHistoryItem } from "./chat-types";

describe("detectSmallTalk", () => {
  it("recognises greetings and thanks in three languages", () => {
    expect(detectSmallTalk("hi")).toBe("greeting");
    expect(detectSmallTalk("Hello Saath!")).toBe("greeting");
    expect(detectSmallTalk("नमस्ते")).toBe("greeting");
    expect(detectSmallTalk("ਸਤ ਸ੍ਰੀ ਅਕਾਲ")).toBe("greeting");
    expect(detectSmallTalk("thank you")).toBe("thanks");
    expect(detectSmallTalk("धन्यवाद साथ")).toBe("thanks");
  });
  it("does not treat real problems as small talk", () => {
    expect(detectSmallTalk("hi my payment is pending from zomato")).toBeNull();
  });
});

describe("resolveThread", () => {
  const followUp: ChatHistoryItem = {
    role: "assistant",
    content: phrase("askWho", "en"),
    kind: "follow_up",
    intent: "complaint_portal",
  };

  it("keeps the topic when the worker answers a follow-up question", () => {
    const t = resolveThread({
      history: [{ role: "user", content: "My payment hasn’t arrived" }, followUp],
      message: "Zomato",
      localIntent: "general",
      localConfidence: "low",
      isEmergency: false,
    });
    expect(t.intent).toBe("complaint_portal");
    expect(t.asked).toBe(1);
    expect(t.facts).toContain("My payment hasn’t arrived");
    expect(t.facts).toContain("Zomato");
  });

  it("starts fresh when there is no pending question", () => {
    const t = resolveThread({
      history: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "Hello!", kind: "message", intent: "general" },
      ],
      message: "write a complaint letter",
      localIntent: "grievance",
      localConfidence: "high",
      isEmergency: false,
    });
    expect(t.intent).toBe("grievance");
    expect(t.asked).toBe(0);
    expect(t.facts).toBe("write a complaint letter");
  });

  it("switches topic for an emergency even mid-thread", () => {
    const t = resolveThread({
      history: [{ role: "user", content: "payment pending" }, followUp],
      message: "I am bleeding, there was an accident",
      localIntent: "safety",
      localConfidence: "high",
      isEmergency: true,
    });
    expect(t.intent).toBe("safety");
  });

  it("does not switch topic on a short answer that happens to match another intent", () => {
    const t = resolveThread({
      history: [{ role: "user", content: "payment pending" }, followUp],
      message: "the company, 2 weeks ago, insurance deducted",
      localIntent: "rights",
      localConfidence: "high",
      isEmergency: false,
    });
    expect(t.intent).toBe("complaint_portal");
  });
});

describe("needsDetailForm", () => {
  it("asks for a safety form on a short starter, not after a form is sent", () => {
    expect(
      needsDetailForm({
        intent: "safety",
        facts: "I feel unsafe at work",
        asked: 0,
        formSubmitted: false,
        isEmergency: false,
      }),
    ).toBe(true);
    expect(
      needsDetailForm({
        intent: "safety",
        facts: "I feel unsafe at work\nwhoOrWhere: a person",
        asked: 1,
        formSubmitted: true,
        isEmergency: false,
      }),
    ).toBe(false);
  });

  it("does not show a form again after one follow-up", () => {
    expect(
      needsDetailForm({
        intent: "safety",
        facts: "the client misbehaved with me",
        asked: 1,
        formSubmitted: false,
        isEmergency: false,
      }),
    ).toBe(false);
  });

  it("offers a complaint form when who/when are missing", () => {
    expect(
      needsDetailForm({
        intent: "complaint_portal",
        facts: "My payment hasn’t arrived",
        asked: 0,
        formSubmitted: false,
        isEmergency: false,
      }),
    ).toBe(true);
  });
});

describe("form helpers", () => {
  it("builds safety and earnings fields", () => {
    expect(formForIntent("safety")?.map((f) => f.id)).toEqual([
      "safeNow",
      "whatHappened",
      "whoOrWhere",
    ]);
    expect(formForIntent("earnings")?.some((f) => f.id === "gross")).toBe(true);
    expect(formForIntent("general")).toBeNull();
  });

  it("formats filled form answers only", () => {
    expect(formatFormAnswers({ who: "Swiggy", amount: "  ", when: "yesterday" })).toBe(
      "who: Swiggy\nwhen: yesterday",
    );
  });
});
