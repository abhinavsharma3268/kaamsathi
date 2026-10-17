import {
  isOccupationId,
  type OccupationId,
  OCCUPATION_IDS,
} from "./occupations";

export const GENDER_IDS = ["woman", "man", "other", "prefer_not"] as const;
export type GenderId = (typeof GENDER_IDS)[number];

export function isGenderId(v: unknown): v is GenderId {
  return typeof v === "string" && (GENDER_IDS as readonly string[]).includes(v);
}

const MAX_NAME = 60;

export type WorkerProfile = {
  primaryOccupation: OccupationId | null;
  additionalOccupations: OccupationId[];
  /** User skipped or dismissed onboarding */
  skipped: boolean;
  updatedAt: string;
  /** Local display name only — never sent as ID proof. */
  displayName: string;
  gender: GenderId | null;
};

export const EMPTY_PROFILE: WorkerProfile = {
  primaryOccupation: null,
  additionalOccupations: [],
  skipped: false,
  updatedAt: "",
  displayName: "",
  gender: null,
};

export function hasCompletedProfileSetup(profile: WorkerProfile): boolean {
  return Boolean(profile.primaryOccupation) || profile.skipped;
}

function sanitizeDisplayName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

export function normalizeProfile(raw: unknown): WorkerProfile {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PROFILE };
  const o = raw as Record<string, unknown>;
  const primary = isOccupationId(o.primaryOccupation)
    ? o.primaryOccupation
    : null;
  const additional = Array.isArray(o.additionalOccupations)
    ? o.additionalOccupations.filter(
        (id): id is OccupationId =>
          isOccupationId(id) && id !== primary,
      )
    : [];
  // Deduplicate and cap
  const seen = new Set<OccupationId>();
  const extras: OccupationId[] = [];
  for (const id of additional) {
    if (seen.has(id)) continue;
    seen.add(id);
    extras.push(id);
    if (extras.length >= 4) break;
  }
  return {
    primaryOccupation: primary,
    additionalOccupations: extras,
    skipped: Boolean(o.skipped),
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
    displayName: sanitizeDisplayName(o.displayName),
    gender: isGenderId(o.gender) ? o.gender : null,
  };
}

export function buildProfile(args: {
  primary: OccupationId | null;
  additional?: OccupationId[];
  skipped?: boolean;
  displayName?: string;
  gender?: GenderId | null;
}): WorkerProfile {
  return normalizeProfile({
    primaryOccupation: args.primary,
    additionalOccupations: (args.additional || []).filter(
      (id) => id !== args.primary,
    ),
    skipped: Boolean(args.skipped),
    updatedAt: new Date().toISOString(),
    displayName: args.displayName ?? "",
    gender: args.gender ?? null,
  });
}

export function allOccupationOptions(): OccupationId[] {
  return [...OCCUPATION_IDS];
}
