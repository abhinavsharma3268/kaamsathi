import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent,
    }),
  })),
}));

describe("runAi integration (mocked Gemini)", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContent.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-flash-latest";
  });

  it("reports configured when GEMINI_API_KEY is set", async () => {
    const { isAiConfigured, getGeminiConfig } = await import("./ai");
    expect(isAiConfigured()).toBe(true);
    expect(getGeminiConfig().model).toBe("gemini-flash-latest");
  });

  it("throws MISSING_API_KEY when credential is absent", async () => {
    delete process.env.GEMINI_API_KEY;
    const { runAi } = await import("./ai");
    await expect(
      runAi({ module: "safety", lang: "en", message: "hello" }),
    ).rejects.toThrow("MISSING_API_KEY");
  });

  it("parses a real model JSON payload into structured output", async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            answer: "Stop safely and rest for 20 minutes.",
            isEmergency: false,
          }),
      },
    });

    const { runAi } = await import("./ai");
    const result = await runAi({
      module: "safety",
      lang: "en",
      message: "I am sleepy while driving",
    });

    expect(result.answer).toContain("rest");
    expect(result.isEmergency).toBe(false);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid model JSON instead of inventing an answer", async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () => "not-json",
      },
    });

    const { runAi } = await import("./ai");
    await expect(
      runAi({ module: "rights", lang: "en", message: "What is e-Shram?" }),
    ).rejects.toThrow();
  });

  it("filters invented Show Me How visual IDs and fills topic defaults", async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            answer: "Open the official portal and check eligibility there.",
            explanation: "Open the official portal and check eligibility there.",
            steps: ["Open e-Shram", "Read the site carefully"],
            materials: ["Aadhaar", "Phone"],
            warnings: ["Do not assume you qualify"],
            nextAction: "Open an official link below",
            visualIds: ["welfare-check", "invented-remote-image"],
          }),
      },
    });

    const { runAi } = await import("./ai");
    const result = await runAi({
      module: "show_me_how",
      lang: "en",
      message: "Show me how to check schemes",
      payload: { topicId: "welfare_schemes" },
    });

    expect(result.visualIds).toEqual(["welfare-check"]);
    expect(result.explanation).toMatch(/official portal/i);
    expect(result.steps?.length).toBeGreaterThan(0);
  });
});
