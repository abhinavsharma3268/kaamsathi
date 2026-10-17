import { describe, expect, it } from "vitest";
import { extractEarningsNumbers, inferIntentLocal } from "./chat-intent";

describe("chat intent heuristics", () => {
  it("flags emergencies as safety with high confidence", () => {
    const r = inferIntentLocal("I was attacked and I am bleeding");
    expect(r.intent).toBe("safety");
    expect(r.isEmergency).toBe(true);
    expect(r.confidence).toBe("high");
  });

  it("routes portal questions without Gemini", () => {
    expect(inferIntentLocal("Where should I submit my complaint?").intent).toBe(
      "complaint_portal",
    );
  });

  it("routes grievance letter asks", () => {
    expect(inferIntentLocal("Help me write a complaint letter").intent).toBe(
      "grievance",
    );
  });

  it("extracts earnings numbers for deterministic math", () => {
    const n = extractEarningsNumbers(
      "Gross 1200 incentive 100 hours 8 fuel 150",
    );
    expect(n.gross).toBe(1200);
    expect(n.incentives).toBe(100);
    expect(n.hours).toBe(8);
    expect(n.fuel).toBe(150);
  });
});
