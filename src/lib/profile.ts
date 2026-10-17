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
const MAX_PHOTO_CHARS = 120_000;

export type WorkerProfile = {
  primaryOccupation: OccupationId | null;
  additionalOccupations: OccupationId[];
  /** User skipped or dismissed onboarding */
  skipped: boolean;
  updatedAt: string;
  /** Local display name only — never sent as ID proof. */
  displayName: string;
  gender: GenderId | null;
  /** Optional local avatar as a small data URL. */
  photoDataUrl: string | null;
};

export const EMPTY_PROFILE: WorkerProfile = {
  primaryOccupation: null,
  additionalOccupations: [],
  skipped: false,
  updatedAt: "",
  displayName: "",
  gender: null,
  photoDataUrl: null,
};

export function hasCompletedProfileSetup(profile: WorkerProfile): boolean {
  return Boolean(profile.primaryOccupation) || profile.skipped;
}

function sanitizeDisplayName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

function sanitizePhoto(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  if (!raw.startsWith("data:image/")) return null;
  if (raw.length > MAX_PHOTO_CHARS) return null;
  return raw;
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
    photoDataUrl: sanitizePhoto(o.photoDataUrl),
  };
}

export function buildProfile(args: {
  primary: OccupationId | null;
  additional?: OccupationId[];
  skipped?: boolean;
  displayName?: string;
  gender?: GenderId | null;
  photoDataUrl?: string | null;
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
    photoDataUrl: args.photoDataUrl ?? null,
  });
}

export function allOccupationOptions(): OccupationId[] {
  return [...OCCUPATION_IDS];
}

/** Shrink a picked image to a small JPEG data URL for localStorage. */
export function resizeImageToDataUrl(
  file: File,
  maxSide = 160,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose a photo image."));
      return;
    }
    if (file.size > 4_000_000) {
      reject(new Error("Photo is too large. Pick a smaller image."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not prepare photo."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
      if (dataUrl.length > MAX_PHOTO_CHARS) {
        reject(new Error("Photo is still too large. Try another image."));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo."));
    };
    img.src = url;
  });
}

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
