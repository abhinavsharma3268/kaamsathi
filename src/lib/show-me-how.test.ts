import { describe, expect, it } from "vitest";
import {
  HOWTO_TOPICS,
  HOWTO_VISUALS,
  buildHowToGuide,
  howToSpeechText,
  isHowToTopicId,
  resolveHowToVisuals,
} from "./show-me-how";

describe("show-me-how", () => {
  it("exposes four curated topics wired to existing modules", () => {
    expect(Object.keys(HOWTO_TOPICS).sort()).toEqual(
      [
        "prepare_grievance",
        "safety_guidance",
        "wage_deductions",
        "welfare_schemes",
      ].sort(),
    );
    expect(HOWTO_TOPICS.wage_deductions.module).toBe("documents");
    expect(HOWTO_TOPICS.prepare_grievance.module).toBe("grievance");
    expect(HOWTO_TOPICS.welfare_schemes.module).toBe("rights");
    expect(HOWTO_TOPICS.safety_guidance.module).toBe("safety");
  });

  it("only resolves visuals from the curated allowlist", () => {
    const visuals = resolveHowToVisuals(
      ["payslip-annotated", "https://evil.example/x.png", "made-up"],
      "wage_deductions",
    );
    expect(visuals).toHaveLength(1);
    expect(visuals[0].id).toBe("payslip-annotated");
    expect(visuals[0].src.startsWith("/howto/")).toBe(true);
  });

  it("falls back to topic visuals when the model invents empty/unknown IDs", () => {
    const visuals = resolveHowToVisuals(["not-real"], "safety_guidance");
    expect(visuals.map((v) => v.id)).toEqual(
      HOWTO_TOPICS.safety_guidance.visualIds,
    );
  });

  it("builds a guide with steps, materials, warnings, and next action", () => {
    const guide = buildHowToGuide({
      topicId: "prepare_grievance",
      explanation: "Write facts first.",
      steps: ["Write what happened", "Check the letter", "Open email"],
      materials: ["Dates", "Amount"],
      warnings: ["Saath does not send the complaint"],
      nextAction: "Fill the complaint form below",
      visualIds: ["complaint-steps", "fake-id"],
    });
    expect(guide.steps).toHaveLength(3);
    expect(guide.materials).toEqual(["Dates", "Amount"]);
    expect(guide.warnings[0]).toMatch(/does not send/i);
    expect(guide.nextAction).toMatch(/complaint form/i);
    expect(guide.visuals.every((v) => v.id in HOWTO_VISUALS)).toBe(true);
    expect(howToSpeechText(guide)).toContain("Write facts first");
    expect(howToSpeechText(guide)).toContain("1. Write what happened");
  });

  it("validates topic ids strictly", () => {
    expect(isHowToTopicId("wage_deductions")).toBe(true);
    expect(isHowToTopicId("random")).toBe(false);
    expect(isHowToTopicId(null)).toBe(false);
  });
});
