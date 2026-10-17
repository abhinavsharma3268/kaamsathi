import { describe, expect, it } from "vitest";
import {
  computeEarnings,
  createEntry,
  summarize,
  startOfWeek,
  toDateKey,
  validateEarningsInput,
  roundMoney,
} from "./earnings";

describe("earnings calculations", () => {
  it("computes net and per-hour from user inputs", () => {
    const calc = computeEarnings({
      date: "2026-10-17",
      gross: 1000,
      incentives: 200,
      hours: 8,
      fuel: 150,
      maintenance: 50,
      otherExpenses: 0,
    });
    expect(calc.net).toBe(1000);
    expect(calc.perHour).toBe(125);
  });

  it("keeps deterministic math when optional employer/workType are present", () => {
    const entry = createEntry({
      date: "2026-10-17",
      gross: 800,
      incentives: 0,
      hours: 4,
      fuel: 100,
      maintenance: 0,
      otherExpenses: 0,
      employer: "Site A",
      workType: "Helper",
    });
    expect(entry.net).toBe(700);
    expect(entry.perHour).toBe(175);
    expect(entry.employer).toBe("Site A");
    // Legacy-shaped records without employer still compute
    const legacy = computeEarnings({
      date: "2026-10-17",
      gross: 800,
      incentives: 0,
      hours: 4,
      fuel: 100,
      maintenance: 0,
      otherExpenses: 0,
    });
    expect(legacy.net).toBe(700);
  });

  it("returns 0 per-hour when hours are zero", () => {
    const calc = computeEarnings({
      date: "2026-10-17",
      gross: 500,
      incentives: 0,
      hours: 0,
      fuel: 0,
      maintenance: 0,
      otherExpenses: 0,
    });
    expect(calc.net).toBe(500);
    expect(calc.perHour).toBe(0);
  });

  it("rounds money to two decimals", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });

  it("creates a persisted-shaped entry with id and timestamps", () => {
    const entry = createEntry({
      date: "2026-10-17",
      gross: 500,
      incentives: 0,
      hours: 5,
      fuel: 100,
      maintenance: 0,
      otherExpenses: 0,
      notes: " lunch ",
    });
    expect(entry.net).toBe(400);
    expect(entry.perHour).toBe(80);
    expect(entry.notes).toBe("lunch");
    expect(entry.id).toBeTruthy();
    expect(entry.createdAt).toBeTruthy();
  });

  it("summarizes today and week from actual entries", () => {
    const today = toDateKey(new Date());
    const entry = createEntry({
      date: today,
      gross: 500,
      incentives: 0,
      hours: 5,
      fuel: 100,
      maintenance: 0,
      otherExpenses: 0,
    });
    const sum = summarize([entry]);
    expect(sum.todayNet).toBe(400);
    expect(sum.todayHours).toBe(5);
    expect(sum.todayPerHour).toBe(80);
    expect(sum.weekNet).toBe(400);
  });

  it("validates missing date and negative values", () => {
    expect(
      validateEarningsInput({
        gross: 100,
        incentives: 0,
        hours: 1,
        fuel: 0,
        maintenance: 0,
        otherExpenses: 0,
      }),
    ).toMatch(/date/i);

    expect(
      validateEarningsInput({
        date: "2026-10-17",
        gross: -1,
        incentives: 0,
        hours: 1,
        fuel: 0,
        maintenance: 0,
        otherExpenses: 0,
      }),
    ).toMatch(/negative/i);

    expect(
      validateEarningsInput({
        date: "2026-10-17",
        gross: 100,
        incentives: 0,
        hours: 2,
        fuel: 10,
        maintenance: 0,
        otherExpenses: 0,
      }),
    ).toBeNull();
  });

  it("returns a Monday-based week start key", () => {
    const key = startOfWeek(new Date("2026-10-17T12:00:00"));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
