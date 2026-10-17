import { describe, expect, it } from "vitest";
import { decideNextStep } from "./chat-decide";

describe("decideNextStep — worker-support vertical", () => {
  it("treats bleeding / attack as emergency help, not a form", () => {
    const d = decideNextStep({
      intent: "complaint_portal",
      facts: "payment pending",
      asked: 1,
      formSubmitted: false,
      isEmergency: true,
      latestMessage: "I am bleeding",
      continuing: true,
    });
    expect(d).toEqual({ type: "help", intent: "safety", reason: "emergency_override" });
  });

  it("answers hello without calling a module", () => {
    const d = decideNextStep({
      intent: "general",
      facts: "hi",
      asked: 0,
      formSubmitted: false,
      isEmergency: false,
      latestMessage: "hi",
      continuing: false,
    });
    expect(d).toEqual({ type: "small_talk", key: "greeting" });
  });

  it("asks Gemini + form when a safety starter has no details", () => {
    const d = decideNextStep({
      intent: "safety",
      facts: "I feel unsafe at work",
      asked: 0,
      formSubmitted: false,
      isEmergency: false,
      latestMessage: "I feel unsafe at work",
      continuing: false,
    });
    expect(d.type).toBe("talk_and_form");
    if (d.type === "talk_and_form") expect(d.intent).toBe("safety");
  });

  it("does not repeat the form after the worker already answered", () => {
    const d = decideNextStep({
      intent: "safety",
      facts: "I feel unsafe at work\nthe client misbehaved with me",
      asked: 1,
      formSubmitted: false,
      isEmergency: false,
      latestMessage: "the client misbehaved with me",
      continuing: true,
    });
    expect(d.type).toBe("help");
    if (d.type === "help") expect(d.reason).toBe("enough_context");
  });

  it("collects who/when for unpaid wages before routing a portal", () => {
    const d = decideNextStep({
      intent: "complaint_portal",
      facts: "My payment hasn’t arrived",
      asked: 0,
      formSubmitted: false,
      isEmergency: false,
      latestMessage: "My payment hasn’t arrived",
      continuing: false,
    });
    expect(d.type).toBe("talk_and_form");
  });

  it("goes straight to earnings help when numbers are already in the message", () => {
    const d = decideNextStep({
      intent: "earnings",
      facts: "earned 1400 fuel 200 hours 9",
      asked: 0,
      formSubmitted: false,
      isEmergency: false,
      latestMessage: "earned 1400 fuel 200 hours 9",
      continuing: false,
    });
    expect(d).toMatchObject({ type: "help", intent: "earnings" });
  });
});
