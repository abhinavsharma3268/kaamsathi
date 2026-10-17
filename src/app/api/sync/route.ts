import { NextResponse } from "next/server";
import { SyncPackSchema } from "@/lib/sync";

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
  const { url, token, configured } = syncConfig();
  const pull = new URL(req.url).searchParams.get("pull") === "1";

  if (!configured) {
    return NextResponse.json({
      configured: false,
      message:
        "Local-first mode: earnings stay on this device. Use Export / Import to move data across phones. Set KAAMSAATHI_SYNC_URL for optional cloud sync.",
    });
  }

  if (!pull) {
    return NextResponse.json({
      configured: true,
      message: "Cloud sync is configured. You can push or pull earnings packs.",
    });
  }

  try {
    const res = await fetch(url!, {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Cloud pull failed (${res.status}).`, code: "CLOUD_PULL_FAILED" },
        { status: 502 },
      );
    }
    const data = await res.json();
    const pack = SyncPackSchema.parse(data.pack ?? data);
    return NextResponse.json({ ok: true, pack });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CLOUD_ERROR";
    return NextResponse.json(
      { error: "Cloud pull failed.", code: "CLOUD_PULL_FAILED", detail: msg },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const { url, token, configured } = syncConfig();
  if (!configured) {
    return NextResponse.json(
      {
        error:
          "Cloud sync is not configured. Export a JSON backup instead, or set KAAMSAATHI_SYNC_URL.",
        code: "SYNC_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = SyncPackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sync pack.", code: "BAD_PACK", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url!, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ pack: parsed.data }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Cloud push failed (${res.status}).`, code: "CLOUD_PUSH_FAILED" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CLOUD_ERROR";
    return NextResponse.json(
      { error: "Cloud push failed.", code: "CLOUD_PUSH_FAILED", detail: msg },
      { status: 502 },
    );
  }
}
