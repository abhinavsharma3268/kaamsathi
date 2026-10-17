/**
 * Shared browser fetch helpers:
 * - no-store (never cache private worker content)
 * - in-flight dedupe for identical POSTs
 * - optional AbortSignal + client timeout
 */

const inflight = new Map<string, Promise<Response>>();

export type FetchJsonOpts = {
  url: string;
  body: unknown;
  signal?: AbortSignal;
  /** Client-side abort if the server is too slow (ms). */
  timeoutMs?: number;
  /** Dedupe key; defaults to url + JSON body. */
  dedupeKey?: string;
};

export async function fetchJsonNoStore(
  opts: FetchJsonOpts,
): Promise<Response> {
  const key =
    opts.dedupeKey ||
    `${opts.url}:${typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)}`;

  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      opts.signal?.addEventListener("abort", onAbort);
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (opts.timeoutMs && opts.timeoutMs > 0) {
        timer = setTimeout(() => controller.abort(), opts.timeoutMs);
      }
      try {
        return await fetch(opts.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(opts.body),
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        if (timer) clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onAbort);
      }
    })();
    inflight.set(key, pending);
    void pending.finally(() => {
      if (inflight.get(key) === pending) inflight.delete(key);
    });
  }

  const res = await pending;
  return res.clone();
}

/** Test helper */
export function __clearInflightFetches() {
  inflight.clear();
}
