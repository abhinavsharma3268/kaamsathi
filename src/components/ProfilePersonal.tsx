"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { GENDER_IDS, type GenderId } from "@/lib/profile";

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

/** Name and gender only — stored on this phone and passed into chat. */
export function ProfilePersonal() {
  const { t } = useLanguage();
  const { profile, updatePersonal } = useProfile();
  const [nameDraft, setNameDraft] = useState(profile.displayName);

  useEffect(() => {
    setNameDraft(profile.displayName);
  }, [profile.displayName]);

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
                onClick={() => updatePersonal({ gender: active ? null : id })}
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
