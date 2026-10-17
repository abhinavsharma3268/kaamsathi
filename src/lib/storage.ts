import type { EarningsEntry } from "./earnings";
import type { Lang } from "./i18n";
import {
  EMPTY_PROFILE,
  normalizeProfile,
  type WorkerProfile,
} from "./profile";

const EARNINGS_KEY = "kaamsaathi.earnings.v1";
const LANG_KEY = "kaamsaathi.lang.v1";
const PROFILE_KEY = "kaamsaathi.profile.v1";

export function loadEarnings(): EarningsEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EARNINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EarningsEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    return [];
  }
}

export function saveEarnings(entries: EarningsEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EARNINGS_KEY, JSON.stringify(entries));
}

export function loadLang(): Lang {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(LANG_KEY);
  if (v === "hi" || v === "pa" || v === "en") return v;
  return "en";
}

export function saveLang(lang: Lang): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANG_KEY, lang);
}

/** Occupation preferences only — no identity documents. */
export function loadProfile(): WorkerProfile {
  if (typeof window === "undefined") return { ...EMPTY_PROFILE };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function saveProfile(profile: WorkerProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify(normalizeProfile({ ...profile, updatedAt: new Date().toISOString() })),
  );
}
