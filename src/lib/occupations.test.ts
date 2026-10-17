import { describe, expect, it } from "vitest";
import {
  getOccupation,
  personalizedHomeTasks,
  personalizedQuickPrompts,
  profileAiContext,
  sortSourcesForOccupation,
} from "./occupations";

describe("occupation personalization", () => {
  it("orders home tasks differently for delivery vs construction", () => {
    const delivery = personalizedHomeTasks("delivery").map((t) => t.id);
    const construction = personalizedHomeTasks("construction").map((t) => t.id);
    expect(delivery[0]).toBe("earnings");
    expect(delivery[1]).toBe("pay_docs");
    expect(construction[1]).toBe("safety");
    expect(delivery).not.toEqual(construction);
  });

  it("exposes occupation-specific quick prompts that open real modules", () => {
    const prompts = personalizedQuickPrompts("delivery");
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.some((p) => p.module === "grievance")).toBe(true);
    expect(prompts.every((p) => p.href.startsWith("/"))).toBe(true);
  });

  it("sorts welfare sources with occupation preferences first", () => {
    const sources = [
      { id: "pmjay" },
      { id: "eShram" },
      { id: "ncs" },
      { id: "labour-code" },
    ];
    const sorted = sortSourcesForOccupation(sources, "construction");
    expect(sorted[0].id).toBe("labour-code");
    expect(sorted.map((s) => s.id)).toContain("ncs");
  });

  it("builds AI context with occupation and language, without identity fields", () => {
    const ctx = profileAiContext({
      primary: "domestic",
      additional: ["vendor"],
      language: "hi",
    });
    expect(ctx.primaryOccupationId).toBe("domestic");
    expect(ctx.language).toBe("hi");
    expect(ctx).not.toHaveProperty("aadhaar");
    expect(ctx).not.toHaveProperty("bankAccount");
    expect(String(ctx.privacyNote)).toMatch(/occupation preferences/i);
    expect(getOccupation("domestic").showEmployer).toBe(true);
  });
});
