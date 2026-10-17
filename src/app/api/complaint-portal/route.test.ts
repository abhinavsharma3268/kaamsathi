import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetRateLimitForTests } from "@/lib/api-guard";

const routeComplaintPortal = vi.fn();

vi.mock("@/lib/complaint-router", async () => {
  const actual = await vi.importActual<typeof import("@/lib/complaint-router")>(
    "@/lib/complaint-router",
  );
  return {
    ...actual,
    routeComplaintPortal: (...args: unknown[]) => routeComplaintPortal(...args),
  };
});

vi.mock("@/lib/ai", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai")>("@/lib/ai");
  return { ...actual, GEMINI_TIMEOUT_MS: 25_000 };
});

describe("POST /api/complaint-portal", () => {
  beforeEach(() => {
    vi.resetModules();
    routeComplaintPortal.mockReset();
    __resetRateLimitForTests();
  });

  async function post(body: unknown) {
    const { POST } = await import("./route");
    return POST(
      new Request("http://localhost/api/complaint-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("rejects empty complaints", async () => {
    const res = await post({
      lang: "en",
      facts: { complaint: "   " },
    });
    expect(res.status).toBe(400);
    expect(routeComplaintPortal).not.toHaveBeenCalled();
  });

  it("maps missing API key to 503 without inventing a portal", async () => {
    routeComplaintPortal.mockRejectedValue(new Error("MISSING_API_KEY"));
    const res = await post({
      lang: "en",
      facts: {
        complaint: "My wages were not paid by my contractor",
        organisationType: "contractor",
        state: "Maharashtra",
      },
    });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe("MISSING_API_KEY");
    expect(json.recommendedPortal).toBeUndefined();
  });

  it("returns a grounded recommendation payload", async () => {
    routeComplaintPortal.mockResolvedValue({
      status: "recommendation",
      issueCategory: "eshram_service",
      summary: "e-Shram service issue",
      missingInformation: [],
      recommendedPortal: {
        id: "eshram_gms",
        displayName: "e-Shram GMS",
        officialUrl: "https://gms.eshram.gov.in/",
        responsibleDepartment: "MoLE",
        supportedIssueCategories: ["eshram_service"],
        geographicScope: "india",
        whoMayUse: "e-Shram issues",
        exclusions: "Not wage disputes",
        requiredDocuments: [],
        verificationStatus: "official_url_verified",
        lastVerifiedDate: "2026-10-17",
        trustedSourceUrls: [
          { title: "e-Shram GMS", url: "https://gms.eshram.gov.in/" },
        ],
      },
      alternativePortals: [],
      reason: "Matches e-Shram service category",
      eligibilityCaveat: "Check the portal text",
      preparationChecklist: ["UAN if you have it"],
      nextSteps: ["Open the official portal"],
      officialSources: [
        { title: "e-Shram GMS", url: "https://gms.eshram.gov.in/" },
      ],
      confidence: "high",
      isEmergency: false,
      copyableSummary: "summary",
      disclaimer: "guidance only",
      meta: { generatedBy: "gemini+rules", injectionFlagged: false },
    });

    const res = await post({
      lang: "hi",
      facts: {
        complaint: "e-Shram registration failed",
        organisationType: "government_department",
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.recommendedPortal.officialUrl).toBe(
      "https://gms.eshram.gov.in/",
    );
  });

  it("surfaces malformed AI failures honestly", async () => {
    routeComplaintPortal.mockRejectedValue(new Error("INVALID_MODEL_RESPONSE"));
    const res = await post({
      lang: "en",
      facts: { complaint: "Need help with a complaint" },
    });
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(["AI_FAILED", "AI_INVALID"]).toContain(json.code);
    expect(json.error).toMatch(/no invented recommendation/i);
  });
});
