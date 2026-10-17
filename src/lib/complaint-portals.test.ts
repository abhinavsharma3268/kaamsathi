import { describe, expect, it } from "vitest";
import {
  COMPLAINT_PORTAL_IDS,
  COMPLAINT_PORTALS,
  isComplaintPortalId,
  isTrustedPortalUrl,
} from "./complaint-portals";

describe("complaint portal directory", () => {
  it("includes the four verified starter portals with https URLs", () => {
    expect(COMPLAINT_PORTAL_IDS).toEqual([
      "samadhan",
      "eshram_gms",
      "cpgrams",
      "punjab_connect",
    ]);
    for (const id of COMPLAINT_PORTAL_IDS) {
      const p = COMPLAINT_PORTALS[id];
      expect(p.officialUrl.startsWith("https://")).toBe(true);
      expect(p.trustedSourceUrls.length).toBeGreaterThan(0);
      expect(p.verificationStatus).toMatch(/verified/);
    }
  });

  it("rejects unregistered portal ids and URLs", () => {
    expect(isComplaintPortalId("samadhan")).toBe(true);
    expect(isComplaintPortalId("random")).toBe(false);
    expect(isTrustedPortalUrl("https://samadhan.labour.gov.in/")).toBe(true);
    expect(isTrustedPortalUrl("https://evil.example/")).toBe(false);
  });
});
