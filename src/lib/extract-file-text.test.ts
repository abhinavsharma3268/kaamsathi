import { describe, expect, it } from "vitest";
import { extractTextFromFile } from "./extract-file-text";

describe("extractTextFromFile", () => {
  it("reads plain text files", async () => {
    const file = new File(["Gross pay: 4200\nNet: 3250"], "payslip.txt", {
      type: "text/plain",
    });
    const text = await extractTextFromFile(file);
    expect(text).toContain("Gross pay");
    expect(text).toContain("3250");
  });

  it("rejects unsupported types", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "scan.bin", {
      type: "application/octet-stream",
    });
    await expect(extractTextFromFile(file)).rejects.toThrow(/Unsupported/i);
  });
});
