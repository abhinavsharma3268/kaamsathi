import { describe, expect, it } from "vitest";
import {
  buildMailto,
  isValidEmail,
  truncateForMailto,
  MAILTO_BODY_LIMIT,
} from "./mailto";

describe("mailto helpers", () => {
  it("builds a mailto URL with encoded subject and body", () => {
    const href = buildMailto(
      "support@example.com",
      "Complaint — pending payment",
      "Hello team,\nPlease help.",
    );
    expect(href.startsWith("mailto:support@example.com?")).toBe(true);
    expect(href).toContain("subject=");
    expect(href).toContain("body=");
    expect(decodeURIComponent(href)).toContain("Hello team");
  });

  it("validates email addresses", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("truncates long bodies for mail clients", () => {
    const long = "x".repeat(MAILTO_BODY_LIMIT + 50);
    const result = truncateForMailto(long);
    expect(result.truncated).toBe(true);
    expect(result.body).toContain("truncated");
    expect(result.body.length).toBeLessThan(long.length + 100);
  });
});
