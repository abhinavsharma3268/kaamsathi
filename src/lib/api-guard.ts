import { NextResponse } from "next/server";

/**
 * Shared server-side guards for API routes:
 * - bounded JSON body reading
 * - layered rate limiting (per-instance memory + optional Redis REST)
 * - safe error responses (no stack traces, no provider detail, no secrets)
 * - provider timeout wrapper
 */

export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export function jsonNoStore(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: NO_STORE_HEADERS,
  });
}

export function safeError(code: string, error: string, status: number) {
  return jsonNoStore({ ok: false, error, code }, { status });
}

export type ReadJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse };

/** Read JSON with a hard byte cap; rejects before parsing oversized bodies. */
export async function readJsonBody(
  req: Request,
  maxBytes: number,
): Promise<ReadJsonResult> {
  const declared = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return {
      ok: false,
      response: safeError("PAYLOAD_TOO_LARGE", "Request is too large.", 413),
    };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      ok: false,
      response: safeError("BAD_REQUEST", "Could not read request body.", 400),
    };
  }

  // Byte length, not char length (multibyte Devanagari/Gurmukhi)
  if (new TextEncoder().encode(text).length > maxBytes) {
    return {
      ok: false,
      response: safeError("PAYLOAD_TOO_LARGE", "Request is too large.", 413),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: safeError("BAD_REQUEST", "Invalid JSON body.", 400),
    };
  }
}

export function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  const real = req.headers.get("x-real-ip")?.trim();
  return first || real || "anonymous";
}

type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSec: number } {
  // Opportunistic cleanup to keep the map bounded
  if (memoryBuckets.size > 5000) {
    for (const [k, b] of memoryBuckets) {
      if (b.resetAt <= now) memoryBuckets.delete(k);
    }
  }
  const b = memoryBuckets.get(key);
  if (!b || b.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Test helper — clears per-instance buckets. */
export function __resetRateLimitForTests() {
  memoryBuckets.clear();
}

/**
 * Optional shared limiter via Upstash-compatible Redis REST (INCR + EXPIRE).
 * Enabled only when RATE_LIMIT_REDIS_URL and RATE_LIMIT_REDIS_TOKEN are set.
 * Falls back to allow-on-error so a limiter outage never blocks workers.
 */
async function redisLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSec: number } | null> {
  const url = process.env.RATE_LIMIT_REDIS_URL?.trim();
  const token = process.env.RATE_LIMIT_REDIS_TOKEN?.trim();
  if (!url || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `saath:rl:${key}`;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec), "NX"],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown }[];
    const count = Number(data?.[0]?.result ?? 0);
    if (!Number.isFinite(count)) return null;
    return count > limit
      ? { allowed: false, retryAfterSec: windowSec }
      : { allowed: true, retryAfterSec: 0 };
  } catch {
    return null;
  }
}

export async function enforceRateLimit(
  req: Request,
  opts: { scope: string; limit: number; windowMs: number },
): Promise<NextResponse | null> {
  const key = `${opts.scope}:${clientKey(req)}`;
  const shared = await redisLimit(key, opts.limit, opts.windowMs);
  const verdict = shared ?? memoryLimit(key, opts.limit, opts.windowMs);
  if (verdict.allowed) return null;
  return NextResponse.json(
    {
      ok: false,
      error: "Too many requests. Please wait a moment and try again.",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        ...NO_STORE_HEADERS,
        "Retry-After": String(verdict.retryAfterSec),
      },
    },
  );
}

/** Reject with AI_TIMEOUT if the provider does not answer in time. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Map internal/provider errors to a safe HTTP response. Never echoes detail. */
export function aiErrorResponse(err: unknown, fallback: string): NextResponse {
  const msg = err instanceof Error ? err.message : "UNKNOWN";
  if (msg === "MISSING_API_KEY") {
    return safeError(
      "MISSING_API_KEY",
      "Assistant unavailable: server API key is not configured.",
      503,
    );
  }
  if (msg === "AI_TIMEOUT" || /timeout|aborted|deadline/i.test(msg)) {
    return safeError(
      "AI_TIMEOUT",
      "The assistant took too long. Please try again.",
      504,
    );
  }
  if (msg === "INVALID_MODEL_RESPONSE" || msg === "EMPTY_MODEL_RESPONSE") {
    return safeError("AI_INVALID", fallback, 502);
  }
  return safeError("AI_FAILED", fallback, 502);
}

/** Log only a short code — never user content, prompts, or provider bodies. */
export function logAiFailure(scope: string, err: unknown) {
  const msg = err instanceof Error ? err.message : "UNKNOWN";
  const code = msg.length > 80 ? `${msg.slice(0, 80)}…` : msg;
  console.error(`[${scope}] ${code}`);
}
