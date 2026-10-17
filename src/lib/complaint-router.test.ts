import { describe, expect, it } from "vitest";
import {
  COMPLAINT_PORTALS,
  isTrustedPortalUrl,
} from "./complaint-portals";
import {
  finalizeComplaintRouting,
  type ComplaintPortalAi,
} from "./complaint-router";

function baseAi(
  over: Partial<ComplaintPortalAi> = {},
): ComplaintPortalAi {
  return {
    status: "recommendation",
    issueCategory: "unclear",
    summary: "Test summary",
    recommendedPortalId: null,
    alternativePortalIds: [],
    reason: "test",
    eligibilityCaveat: "caveat",
    preparationChecklist: [],
    nextSteps: [],
    confidence: "medium",
    ...over,
  };
}

describe("complaint portal routing rules", () => {
  it("routes an eligible-looking private wage dispute to SAMADHAN with caveats", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        issueCategory: "wage_employment_dispute",
        recommendedPortalId: "samadhan",
        eligibilityCaveat: "Only if you qualify as a workman under labour law.",
        confidence: "medium",
      }),
      {
        complaint: "My factory contractor did not pay wages for 15 days.",
        organisationType: "contractor",
        state: "Maharashtra",
        occupation: "helper",
      },
    );
    expect(result.status).toBe("recommendation");
    expect(result.recommendedPortal?.id).toBe("samadhan");
    expect(result.eligibilityCaveat.toLowerCase()).toMatch(/qualif|caveat|workman|eligible|law/);
    expect(result.recommendedPortal?.officialUrl).toBe(
      COMPLAINT_PORTALS.samadhan.officialUrl,
    );
  });

  it("does not automatically declare a gig platform dispute eligible for SAMADHAN", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        issueCategory: "wage_employment_dispute",
        recommendedPortalId: "samadhan",
        confidence: "high",
      }),
      {
        complaint: "Swiggy did not pay my delivery incentives this week.",
        organisationType: "gig_platform",
        organisationName: "Swiggy",
        state: "Karnataka",
      },
    );
    expect(result.recommendedPortal?.id).not.toBe("samadhan");
    expect(result.status).toBe("manual_assistance");
  });

  it("routes e-Shram registration problems to e-Shram GMS", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        issueCategory: "eshram_service",
        recommendedPortalId: "eshram_gms",
      }),
      {
        complaint: "My e-Shram registration is stuck and I cannot update my profile.",
        organisationType: "government_department",
      },
    );
    expect(result.status).toBe("recommendation");
    expect(result.recommendedPortal?.id).toBe("eshram_gms");
    expect(result.recommendedPortal?.officialUrl).toBe(
      "https://gms.eshram.gov.in/",
    );
  });

  it("distinguishes government department grievances toward CPGRAMS", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        issueCategory: "government_service",
        recommendedPortalId: "cpgrams",
      }),
      {
        complaint: "The district labour office ignored my written application.",
        organisationType: "government_department",
        state: "Uttar Pradesh",
      },
    );
    expect(result.recommendedPortal?.id).toBe("cpgrams");
  });

  it("considers Punjab Connect for Punjab government-service issues", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        issueCategory: "punjab_gov_service",
        recommendedPortalId: "punjab_connect",
      }),
      {
        complaint: "Punjab government service desk did not respond to my request.",
        organisationType: "government_department",
        state: "Punjab",
      },
    );
    expect(result.recommendedPortal?.id).toBe("punjab_connect");
    expect(result.recommendedPortal?.officialUrl).toBe(
      "https://connect.punjab.gov.in/",
    );
  });

  it("asks a follow-up when organisation type is missing for routing", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        status: "recommendation",
        issueCategory: "wage_employment_dispute",
        recommendedPortalId: "samadhan",
        followUpQuestion: undefined,
      }),
      {
        complaint: "I was not paid for my work last month.",
        organisationType: "unknown",
      },
    );
    expect(result.status).toBe("needs_information");
    expect(result.followUpQuestion?.length).toBeGreaterThan(5);
    expect(result.recommendedPortal).toBeNull();
  });

  it("force-resolves after a follow-up instead of looping", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        status: "needs_information",
        issueCategory: "unclear",
        summary:
          "Worker reports mistreatment at a private employer workplace.",
        followUpQuestion:
          "Could you clarify what kind of mistreatment happened?",
        recommendedPortalId: null,
      }),
      {
        complaint:
          "I faced mistreatment at my private employer workplace.\n\nExtra detail: the work was not given proper time and efforts",
        organisationType: "unknown",
        forceResolve: true,
        followUpRound: 1,
      },
    );
    expect(result.status).not.toBe("needs_information");
    expect(result.followUpQuestion).toBeUndefined();
    expect(result.workerReport.length).toBeGreaterThan(20);
    expect(result.draftedMessage.length).toBeGreaterThan(20);
    expect(result.recommendedPortal?.id).toBe("samadhan");
  });

  it("returns manual assistance when the case is uncertain and no portal fits", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        status: "manual_assistance",
        issueCategory: "unclear",
        recommendedPortalId: null,
        confidence: "low",
        summary: "Not enough clarity to choose a portal.",
      }),
      {
        complaint: "Something went wrong with my work.",
        organisationType: "other",
      },
    );
    expect(result.status).toBe("manual_assistance");
    expect(result.recommendedPortal).toBeNull();
  });

  it("drops invented portal IDs and never trusts unknown URLs", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        recommendedPortalId: "https://evil.example/fake",
        alternativePortalIds: ["made-up-portal", "cpgrams"],
        issueCategory: "government_service",
        status: "recommendation",
      }),
      {
        complaint: "Government ration card office mistreated me.",
        organisationType: "government_department",
        state: "Bihar",
      },
    );
    expect(result.recommendedPortal?.id).toBe("cpgrams");
    expect(
      result.alternativePortals.every((p) =>
        isTrustedPortalUrl(p.officialUrl),
      ),
    ).toBe(true);
    expect(isTrustedPortalUrl("https://evil.example/fake")).toBe(false);
  });

  it("prioritizes emergency / safety over grievance routing", () => {
    const result = finalizeComplaintRouting(
      baseAi({
        isEmergency: true,
        issueCategory: "safety_emergency",
        recommendedPortalId: "cpgrams",
        summary: "I was assaulted at work and need help now.",
      }),
      {
        complaint: "I was attacked and I am bleeding.",
        organisationType: "other",
      },
    );
    expect(result.isEmergency).toBe(true);
    expect(result.recommendedPortal).toBeNull();
    expect(result.nextSteps.some((s) => /safety|112|108/i.test(s))).toBe(true);
  });
});
