import { describe, expect, it } from "vitest";
import { extractDocumentEntities } from "./document-extract";

const SAMPLE = `
Partner Payment Statement
Partner ID: DR-88421
Statement Period: 01 Oct 2026 – 07 Oct 2026
Gross trip earnings ........................ Rs 5,000.00
Fuel advance recovery (code UNIQUE_DED_9911) Rs 350.00
Platform service fee ..................... Rs 220.00
NET PAYABLE ............................... Rs 4,840.40
Payout status: PENDING (expected by 10 Oct 2026)
If UNIQUE_DED_9911 is incorrect, raise a ticket within 7 days.
`;

describe("extractDocumentEntities", () => {
  it("extracts amounts, codes, status, and obligations in code", () => {
    const entities = extractDocumentEntities(SAMPLE);
    expect(entities.deductionCodes).toContain("UNIQUE_DED_9911");
    expect(entities.identifiers).toContain("DR-88421");
    expect(entities.netPayableInr).toBe(4840.4);
    expect(entities.payoutStatus?.toLowerCase()).toContain("pending");
    expect(entities.summaryLines.some((l) => /net payable/i.test(l))).toBe(true);
    expect(entities.obligations.length).toBeGreaterThan(0);
  });
});
