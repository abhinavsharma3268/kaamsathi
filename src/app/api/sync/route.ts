import { SyncPackSchema } from "@/lib/sync";
import {
  enforceRateLimit,
  jsonNoStore,
  readJsonBody,
  safeError,
} from "@/lib/api-guard";

export const runtime = "nodejs";

/**
 * Optional cloud sync.
 * When KAAMSAATHI_SYNC_URL (+ optional KAAMSAATHI_SYNC_TOKEN) is set,
 * packs are forwarded to that HTTPS endpoint (PUT for push, GET for pull).
 * Without it, the API reports local-first mode (export/import on device).
 */

function syncConfig() {
  const url = process.env.KAAMSAATHI_SYNC_URL?.trim() || null;
  const token = process.env.KAAMSAATHI_SYNC_TOKEN?.trim() || null;
  return { url, token, configured: Boolean(url) };
}

function authHeaders(token: string | null): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, {
    scope: "sync-get",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { url, token, configured } = syncConfig();
  const pull = new URL(req.url).searchParams.get("pull") === "1";

  if (!configured) {
    return jsonNoStore({
      configured: false,
      message:
        "Local-first mode: earnings stay on this device. Use Export / Import to move data across phones. Set KAAMSAATHI_SYNC_URL for optional cloud sync.",
    });
  }

  if (!pull) {
    return jsonNoStore({
      configured: true,
      message: "Cloud sync is configured. You can push or pull earnings packs.",
    });
  }

  try {
    const res = await fetch(url!, {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return safeError(
        "CLOUD_PULL_FAILED",
        "Cloud pull failed. Please try again.",
        502,
      );
    }
    const data = await res.json();
    const pack = SyncPackSchema.parse(data.pack ?? data);
    return jsonNoStore({ ok: true, pack });
  } catch {
    return safeError(
      "CLOUD_PULL_FAILED",
      "Cloud pull failed. Please try again.",
      502,
    );
  }
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, {
    scope: "sync-post",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { url, token, configured } = syncConfig();
  if (!configured) {
    return safeError(
      "SYNC_NOT_CONFIGURED",
      "Cloud sync is not configured. Export a JSON backup instead, or set KAAMSAATHI_SYNC_URL.",
      503,
    );
  }

  const body = await readJsonBody(req, 500_000);
  if (!body.ok) return body.response;

  const parsed = SyncPackSchema.safeParse(body.data);
  if (!parsed.success) {
    return safeError("BAD_PACK", "Invalid sync pack.", 400);
  }

  try {
    const res = await fetch(url!, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ pack: parsed.data }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return safeError(
        "CLOUD_PUSH_FAILED",
        "Cloud push failed. Please try again.",
        502,
      );
    }
    return jsonNoStore({ ok: true });
  } catch {
    return safeError(
      "CLOUD_PUSH_FAILED",
      "Cloud push failed. Please try again.",
      502,
    );
  }
}
