import {
  isOccupationId,
  type OccupationId,
  OCCUPATION_IDS,
} from "./occupations";

export type WorkerProfile = {
  primaryOccupation: OccupationId | null;
  additionalOccupations: OccupationId[];
  /** User skipped or dismissed onboarding */
  skipped: boolean;
  updatedAt: string;
};

export const EMPTY_PROFILE: WorkerProfile = {
  primaryOccupation: null,
  additionalOccupations: [],
  skipped: false,
  updatedAt: "",
};

export function hasCompletedProfileSetup(profile: WorkerProfile): boolean {
  return Boolean(profile.primaryOccupation) || profile.skipped;
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
  };
}

export function buildProfile(args: {
  primary: OccupationId | null;
  additional?: OccupationId[];
  skipped?: boolean;
}): WorkerProfile {
  return normalizeProfile({
    primaryOccupation: args.primary,
    additionalOccupations: (args.additional || []).filter(
      (id) => id !== args.primary,
    ),
    skipped: Boolean(args.skipped),
    updatedAt: new Date().toISOString(),
  });
}

export function allOccupationOptions(): OccupationId[] {
  return [...OCCUPATION_IDS];
}
