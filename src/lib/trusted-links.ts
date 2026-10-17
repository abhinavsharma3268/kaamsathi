import { COMPLAINT_PORTAL_IDS, COMPLAINT_PORTALS } from "./complaint-portals";
import { WELFARE_SOURCES } from "./welfare-sources";

/**
 * Allowlist for model-suggested "sources" links.
 * Model output can only surface links on Indian government domains
 * or exact curated entries — never arbitrary hosts.
 */
const EXACT = new Set<string>([
  ...WELFARE_SOURCES.map((s) => s.url),
  ...COMPLAINT_PORTAL_IDS.map((id) => COMPLAINT_PORTALS[id].officialUrl),
]);

const GOV_SUFFIXES = [".gov.in", ".nic.in"];

export function isTrustedSourceUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (EXACT.has(url) || EXACT.has(`${u.origin}/`)) return true;
  const host = u.hostname.toLowerCase();
  return GOV_SUFFIXES.some(
    (suf) => host.endsWith(suf) && host.length > suf.length,
  );
}

export function filterTrustedSources<T extends { title: string; url: string }>(
  sources: T[] | undefined,
  max = 6,
): T[] {
  if (!sources?.length) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const s of sources) {
    if (!s?.url || seen.has(s.url)) continue;
    if (!isTrustedSourceUrl(s.url)) continue;
    seen.add(s.url);
    out.push({ ...s, title: String(s.title || s.url).slice(0, 160) });
    if (out.length >= max) break;
  }
  return out;
}
