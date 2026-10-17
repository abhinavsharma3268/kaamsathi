import { afterEach, describe, expect, it, vi } from "vitest";
import { __clearInflightFetches, fetchJsonNoStore } from "./client-fetch";

describe("fetchJsonNoStore", () => {
  afterEach(() => {
    __clearInflightFetches();
    vi.unstubAllGlobals();
  });

  it("dedupes identical in-flight POSTs into one network call", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 30));
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const body = { message: "hi" };
    const [a, b] = await Promise.all([
      fetchJsonNoStore({ url: "/api/chat", body }),
      fetchJsonNoStore({ url: "/api/chat", body }),
    ]);
    expect(calls).toBe(1);
    expect((await a.json()).ok).toBe(true);
    expect((await b.json()).ok).toBe(true);
  });

  it("uses cache: no-store", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await fetchJsonNoStore({ url: "/api/ai", body: { x: 1 } });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai",
      expect.objectContaining({ cache: "no-store", method: "POST" }),
    );
  });
});
