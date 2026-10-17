import { beforeEach, describe, expect, it } from "vitest";
import { consumePrefill, setPrefill } from "./prefill";

describe("workflow prefill", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores and consumes a prefill once for the matching module", () => {
    setPrefill({
      module: "grievance",
      value: "My wages were not paid",
      field: "issue",
    });
    expect(consumePrefill("safety")).toBeNull();
    const got = consumePrefill("grievance");
    expect(got?.value).toMatch(/wages/i);
    expect(consumePrefill("grievance")).toBeNull();
  });
});
