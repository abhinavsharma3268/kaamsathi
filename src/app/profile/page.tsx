"use client";

import { ProfileSetup } from "@/components/ProfileSetup";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { getOccupation } from "@/lib/occupations";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { profile, clearProfile } = useProfile();
  const primary = profile.primaryOccupation
    ? t(getOccupation(profile.primaryOccupation).nameKey)
    : t("profileNone");

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("profilePageTitle")}
      </h1>
      <p className="text-base ks-muted">{t("profilePageBody")}</p>
      <p className="text-base">
        <span className="font-bold">{t("profilePrimary")}:</span> {primary}
      </p>
      {profile.additionalOccupations.length > 0 && (
        <p className="text-base">
          <span className="font-bold">{t("profileAdditional")}:</span>{" "}
          {profile.additionalOccupations
            .map((id) => t(getOccupation(id).nameKey))
            .join(", ")}
        </p>
      )}

      <ProfileSetup showSkip={false} />

      <button
        type="button"
        className="ks-btn ks-btn-secondary min-h-12 w-full text-base"
        onClick={clearProfile}
      >
        {t("profileClear")}
      </button>
    </div>
  );
}
