import { describe, expect, it } from "vitest";
import { filterTrustedSources, isTrustedSourceUrl } from "./trusted-links";

describe("trusted links", () => {
  it("allows https government domains and curated URLs", () => {
    expect(isTrustedSourceUrl("https://www.eshram.gov.in/")).toBe(true);
    expect(isTrustedSourceUrl("http://www.eshram.gov.in/")).toBe(false);
    expect(isTrustedSourceUrl("https://evil.example/phish")).toBe(false);
  });

  it("filters model-suggested sources to trusted hosts only", () => {
    const out = filterTrustedSources([
      { title: "Bad", url: "https://malware.example/x" },
      { title: "e-Shram", url: "https://www.eshram.gov.in/" },
      { title: "Dup", url: "https://www.eshram.gov.in/" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toContain("eshram.gov.in");
  });
});
