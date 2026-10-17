import { describe, expect, it } from "vitest";
import {
  buildSyncPack,
  mergeEarnings,
  parseSyncPack,
} from "./sync";
import type { EarningsEntry } from "./earnings";

const sample = (id: string, date: string): EarningsEntry => ({
  id,
  date,
  gross: 100,
  incentives: 0,
  hours: 2,
  fuel: 10,
  maintenance: 0,
  otherExpenses: 0,
  notes: "",
  net: 90,
  perHour: 45,
  createdAt: "2026-10-17T00:00:00.000Z",
});

describe("sync pack", () => {
  it("builds and parses a versioned earnings pack", () => {
    const pack = buildSyncPack([sample("a", "2026-10-17")]);
    expect(pack.version).toBe(1);
    const roundTrip = parseSyncPack(JSON.stringify(pack));
    expect(roundTrip.earnings).toHaveLength(1);
  });

  it("merges by id with incoming winning", () => {
    const local = [sample("a", "2026-10-01"), sample("b", "2026-10-02")];
    const incoming = [{ ...sample("a", "2026-10-17"), net: 200, perHour: 100 }];
    const merged = mergeEarnings(local, incoming);
    expect(merged.find((e) => e.id === "a")?.net).toBe(200);
    expect(merged).toHaveLength(2);
  });
});
