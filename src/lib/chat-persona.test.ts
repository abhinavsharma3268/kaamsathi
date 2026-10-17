import { describe, expect, it } from "vitest";
import {
  detectSmallTalk,
  missingDetailQuestion,
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

describe("missingDetailQuestion", () => {
  it("asks who first, then when/amount, then stops", () => {
    expect(
      missingDetailQuestion(
        { intent: "grievance", facts: "Help me write a complaint", asked: 0 },
        "en",
      ),
    ).toBe(phrase("askWho", "en"));
    expect(
      missingDetailQuestion(
        { intent: "grievance", facts: "Help me write a complaint\nSwiggy", asked: 1 },
        "hi",
      ),
    ).toBe(phrase("askWhenAmount", "hi"));
    expect(
      missingDetailQuestion(
        {
          intent: "grievance",
          facts: "Help me write a complaint\nSwiggy\n3 days ago ₹1200",
          asked: 2,
        },
        "en",
      ),
    ).toBeNull();
  });

  it("never asks more than two questions", () => {
    expect(
      missingDetailQuestion({ intent: "complaint_portal", facts: "x", asked: 2 }, "en"),
    ).toBeNull();
  });

  it("asks what is happening for a bare safety starter but not for a detailed one", () => {
    expect(
      missingDetailQuestion({ intent: "safety", facts: "I feel unsafe at work", asked: 0 }, "pa"),
    ).toBe(phrase("askSafety", "pa"));
    expect(
      missingDetailQuestion(
        {
          intent: "safety",
          facts: "A customer keeps following me after deliveries at night and shouting at me",
          asked: 0,
        },
        "en",
      ),
    ).toBeNull();
  });

  it("asks work/state for a bare scheme question", () => {
    expect(
      missingDetailQuestion({ intent: "rights", facts: "Which scheme can help me?", asked: 0 }, "en"),
    ).toBe(phrase("askRights", "en"));
    expect(
      missingDetailQuestion(
        { intent: "rights", facts: "Which scheme can help me? I am a delivery rider in Punjab", asked: 0 },
        "en",
      ),
    ).toBeNull();
  });

  it("does not gate earnings/documents/general here", () => {
    expect(missingDetailQuestion({ intent: "earnings", facts: "x", asked: 0 }, "en")).toBeNull();
    expect(missingDetailQuestion({ intent: "general", facts: "x", asked: 0 }, "en")).toBeNull();
  });
});
