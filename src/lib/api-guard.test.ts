import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetRateLimitForTests,
  enforceRateLimit,
  readJsonBody,
  safeError,
  withTimeout,
} from "./api-guard";

describe("api-guard", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it("rejects oversized JSON bodies before parsing", async () => {
    const big = "x".repeat(200);
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": "200" },
      body: JSON.stringify({ a: big }),
    });
    const res = await readJsonBody(req, 50);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(413);
  });

  it("parses valid JSON under the byte cap", async () => {
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    const res = await readJsonBody(req, 10_000);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual({ hello: "world" });
  });

  it("rate-limits repeated requests from the same client", async () => {
    const mk = () =>
      new Request("http://localhost/api/x", {
        headers: { "x-forwarded-for": "203.0.113.9" },
      });
    for (let i = 0; i < 3; i++) {
      expect(
        await enforceRateLimit(mk(), {
          scope: "test",
          limit: 3,
          windowMs: 60_000,
        }),
      ).toBeNull();
    }
    const blocked = await enforceRateLimit(mk(), {
      scope: "test",
      limit: 3,
      windowMs: 60_000,
    });
    expect(blocked?.status).toBe(429);
    const json = await blocked!.json();
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("withTimeout rejects slow work as AI_TIMEOUT", async () => {
    await expect(
      withTimeout(new Promise(() => undefined), 20),
    ).rejects.toThrow("AI_TIMEOUT");
  });

  it("safeError never includes stack or detail fields", async () => {
    const res = safeError("X", "Nope", 400);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: "Nope", code: "X" });
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/);
  });
});
