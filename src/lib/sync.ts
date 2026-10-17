import { z } from "zod";
import type { EarningsEntry } from "./earnings";

export const SyncPackSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  deviceLabel: z.string().optional(),
  earnings: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      gross: z.number(),
      incentives: z.number(),
      hours: z.number(),
      fuel: z.number(),
      maintenance: z.number(),
      otherExpenses: z.number(),
      notes: z.string().optional(),
      employer: z.string().optional(),
      workType: z.string().optional(),
      net: z.number(),
      perHour: z.number(),
      createdAt: z.string(),
    }),
  ),
});

export type SyncPack = z.infer<typeof SyncPackSchema>;

export function buildSyncPack(
  earnings: EarningsEntry[],
  deviceLabel = "KaamSaathi",
): SyncPack {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    deviceLabel,
    earnings,
  };
}

export function parseSyncPack(raw: string): SyncPack {
  const parsed = JSON.parse(raw) as unknown;
  return SyncPackSchema.parse(parsed);
}

/** Merge by id; imported entries win on conflict. */
export function mergeEarnings(
  local: EarningsEntry[],
  incoming: EarningsEntry[],
): EarningsEntry[] {
  const map = new Map<string, EarningsEntry>();
  for (const e of local) map.set(e.id, e);
  for (const e of incoming) map.set(e.id, e);
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type CloudSyncStatus = {
  configured: boolean;
  message: string;
};

export async function fetchCloudSyncStatus(): Promise<CloudSyncStatus> {
  try {
    const res = await fetch("/api/sync");
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      message: data.message || "",
    };
  } catch {
    return {
      configured: false,
      message: "Could not check cloud sync status.",
    };
  }
}

export async function pushToCloud(pack: SyncPack): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pack),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error || "Cloud sync failed." };
  return { ok: true };
}

export async function pullFromCloud(): Promise<
  { ok: true; pack: SyncPack } | { ok: false; error: string }
> {
  const res = await fetch("/api/sync?pull=1");
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error || "Cloud pull failed." };
  try {
    const pack = SyncPackSchema.parse(data.pack);
    return { ok: true, pack };
  } catch {
    return { ok: false, error: "Invalid sync pack from cloud." };
  }
}
