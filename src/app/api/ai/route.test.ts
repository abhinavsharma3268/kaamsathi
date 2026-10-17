import { beforeEach, describe, expect, it, vi } from "vitest";

const runAi = vi.fn();

vi.mock("@/lib/ai", () => ({
  runAi: (...args: unknown[]) => runAi(...args),
}));

describe("POST /api/ai", () => {
  beforeEach(() => {
    vi.resetModules();
    runAi.mockReset();
  });

  async function post(body: unknown) {
    const { POST } = await import("./route");
    return POST(
      new Request("http://localhost/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("rejects empty safety questions", async () => {
    const res = await post({ module: "safety", lang: "en", message: "  " });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("EMPTY_MESSAGE");
    expect(runAi).not.toHaveBeenCalled();
  });

  it("rejects empty grievance issues", async () => {
    const res = await post({
      module: "grievance",
      lang: "en",
      payload: { issue: "" },
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("EMPTY_ISSUE");
  });

  it("rejects empty documents", async () => {
    const res = await post({
      module: "documents",
      lang: "en",
      payload: { documentText: "" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("EMPTY_DOCUMENT");
  });

  it("returns Gemini output for a valid grievance request", async () => {
    runAi.mockResolvedValue({
      answer: "Review before sending.",
      draft: "To: Support\nSubject: Delayed payment",
    });

    const res = await post({
      module: "grievance",
      lang: "en",
      payload: {
        issue: "Payment delayed for 12 days",
        platformOrEmployer: "DemoRide",
        amountInvolvedInr: "2450",
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.draft).toContain("Delayed payment");
    expect(json.meta.generatedBy).toBe("gemini");
    expect(runAi).toHaveBeenCalledWith(
      expect.objectContaining({ module: "grievance", lang: "en" }),
    );
  });

  it("maps missing API key to 503 without fabricating content", async () => {
    runAi.mockRejectedValue(new Error("MISSING_API_KEY"));
    const res = await post({
      module: "safety",
      lang: "en",
      message: "I feel tired",
    });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe("MISSING_API_KEY");
    expect(json.answer).toBeUndefined();
  });

  it("rejects invalid Show Me How topics", async () => {
    const res = await post({
      module: "show_me_how",
      lang: "en",
      payload: { topicId: "not-a-topic" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID_HOWTO_TOPIC");
    expect(runAi).not.toHaveBeenCalled();
  });

  it("returns a curated howTo guide for a valid Show Me How topic", async () => {
    runAi.mockResolvedValue({
      answer: "Check gross, cuts, and net.",
      explanation: "Check gross, cuts, and net.",
      steps: ["Find gross", "Find deductions", "Find net"],
      materials: ["Your payslip or payout screen"],
      warnings: ["Do not invent missing numbers"],
      nextAction: "Paste your real payslip below",
      visualIds: ["payslip-annotated", "https://evil.example/x.png"],
    });

    const res = await post({
      module: "show_me_how",
      lang: "en",
      payload: { topicId: "wage_deductions" },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.meta.kind).toBe("show_me_how");
    expect(json.howTo.topicId).toBe("wage_deductions");
    expect(json.howTo.steps).toHaveLength(3);
    expect(json.howTo.visuals).toHaveLength(1);
    expect(json.howTo.visuals[0].src).toBe("/howto/payslip-annotated.svg");
    expect(json.howTo.visuals[0].src).not.toContain("evil.example");
    expect(runAi).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "show_me_how",
        payload: expect.objectContaining({ topicId: "wage_deductions" }),
      }),
    );
  });
});
