"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import {
  GENDER_IDS,
  profileInitials,
  resizeImageToDataUrl,
  type GenderId,
} from "@/lib/profile";

const GENDER_LABEL: Record<
  GenderId,
  | "profileGenderWoman"
  | "profileGenderMan"
  | "profileGenderOther"
  | "profileGenderPreferNot"
> = {
  woman: "profileGenderWoman",
  man: "profileGenderMan",
  other: "profileGenderOther",
  prefer_not: "profileGenderPreferNot",
};

export function ProfilePersonal() {
  const { t } = useLanguage();
  const { profile, updatePersonal } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState(profile.displayName);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setNameDraft(profile.displayName);
  }, [profile.displayName]);

  const initials = profileInitials(profile.displayName || nameDraft);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      updatePersonal({ photoDataUrl: dataUrl });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : t("profilePhotoFail"));
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <section className="ks-card space-y-4 p-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--brand-deep)]">
          {t("profileAboutTitle")}
        </h2>
        <p className="mt-1 text-base leading-relaxed ks-muted">
          {t("profileAboutBody")}
        </p>
        <p className="mt-1 text-sm ks-muted">{t("profileAboutPrivacy")}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] ring-2 ring-[var(--line)]"
          onClick={() => fileRef.current?.click()}
          disabled={photoBusy}
          aria-label={t("profilePhotoAdd")}
        >
          {profile.photoDataUrl ? (
            <img
              src={profile.photoDataUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : initials ? (
            <span className="text-2xl font-bold text-[var(--brand-deep)]">
              {initials}
            </span>
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/15 text-[var(--brand-deep)]"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
              </svg>
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-bold text-[var(--brand-deep)]">
            {t("profilePhoto")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ks-btn ks-btn-secondary min-h-11 rounded-2xl px-3 text-sm"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
            >
              {photoBusy ? t("loading") : t("profilePhotoAdd")}
            </button>
            {profile.photoDataUrl && (
              <button
                type="button"
                className="ks-btn ks-btn-secondary min-h-11 rounded-2xl px-3 text-sm"
                onClick={() => updatePersonal({ photoDataUrl: null })}
              >
                {t("profilePhotoRemove")}
              </button>
            )}
          </div>
          <p className="text-xs ks-muted">{t("profilePhotoHint")}</p>
          {photoError && (
            <p className="text-sm font-semibold text-[var(--danger)]">{photoError}</p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPickPhoto(e)}
        />
      </div>

      <label className="block">
        <span className="ks-label">{t("profileName")}</span>
        <input
          className="ks-input text-base"
          value={nameDraft}
          maxLength={60}
          placeholder={t("profileNamePh")}
          autoComplete="name"
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            if (nameDraft.trim() !== profile.displayName) {
              updatePersonal({ displayName: nameDraft });
            }
          }}
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-bold text-[var(--brand-deep)]">
          {t("profileGender")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {GENDER_IDS.map((id) => {
            const active = profile.gender === id;
            return (
              <button
                key={id}
                type="button"
                className={`ks-btn min-h-12 rounded-2xl px-3 text-sm ${
                  active ? "ks-btn-primary" : "ks-btn-secondary"
                }`}
                aria-pressed={active}
                onClick={() =>
                  updatePersonal({ gender: active ? null : id })
                }
              >
                {t(GENDER_LABEL[id])}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
