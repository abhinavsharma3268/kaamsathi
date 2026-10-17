"use client";

import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { OCCUPATION_IDS, getOccupation } from "@/lib/occupations";

export function ProfileSetup({
  compact = false,
  showSkip = true,
}: {
  compact?: boolean;
  showSkip?: boolean;
}) {
  const { t } = useLanguage();
  const {
    profile,
    setPrimary,
    toggleAdditional,
    skipSetup,
    setupDone,
  } = useProfile();

  return (
    <section className={`ks-card space-y-3 ${compact ? "p-4" : "p-5"}`}>
      <div>
        <h2
          className={`font-bold text-[var(--brand-deep)] ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          {t("profileTitle")}
        </h2>
        <p className="mt-1 text-base leading-relaxed ks-muted">
          {t("profileBody")}
        </p>
        <p className="mt-1 text-sm ks-muted">{t("profilePrivacy")}</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-[var(--brand-deep)]">
          {t("profilePrimary")}
        </p>
        <div className="grid gap-2">
          {OCCUPATION_IDS.map((id) => {
            const active = profile.primaryOccupation === id;
            return (
              <button
                key={id}
                type="button"
                className={`ks-btn min-h-14 w-full justify-start rounded-2xl px-4 text-left text-base ${
                  active ? "ks-btn-primary" : "ks-btn-secondary"
                }`}
                aria-pressed={active}
                onClick={() => setPrimary(id)}
              >
                {t(getOccupation(id).nameKey)}
              </button>
            );
          })}
        </div>
      </div>

      {profile.primaryOccupation && (
        <div>
          <p className="mb-2 text-sm font-bold text-[var(--brand-deep)]">
            {t("profileAdditional")}
          </p>
          <p className="mb-2 text-sm ks-muted">{t("profileAdditionalHint")}</p>
          <div className="flex flex-wrap gap-2">
            {OCCUPATION_IDS.filter((id) => id !== profile.primaryOccupation).map(
              (id) => {
                const active = profile.additionalOccupations.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ks-btn min-h-12 rounded-2xl px-3 text-sm ${
                      active ? "ks-btn-primary" : "ks-btn-secondary"
                    }`}
                    aria-pressed={active}
                    onClick={() => toggleAdditional(id)}
                  >
                    {t(getOccupation(id).nameKey)}
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {showSkip && !setupDone && (
          <button
            type="button"
            className="ks-btn ks-btn-secondary min-h-12 flex-1 text-base"
            onClick={skipSetup}
          >
            {t("profileSkip")}
          </button>
        )}
        {setupDone && (
          <Link
            href="/profile"
            className="ks-btn ks-btn-secondary min-h-12 flex-1 text-center text-base"
          >
            {t("profileChange")}
          </Link>
        )}
      </div>
    </section>
  );
}
