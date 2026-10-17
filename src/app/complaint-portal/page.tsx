"use client";

import { useMemo, useState } from "react";
import { ComplaintPortalCard } from "@/components/ComplaintPortalCard";
import { VoiceInput } from "@/components/VoiceInput";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { callComplaintPortal } from "@/lib/client-complaint-portal";
import type { ComplaintPortalResult } from "@/lib/complaint-router";
import type { OrganisationType } from "@/lib/complaint-router";
import { getOccupation } from "@/lib/occupations";
import Link from "next/link";

const ORG_OPTIONS: { id: OrganisationType; labelKey: string }[] = [
  { id: "gig_platform", labelKey: "cpOrgGig" },
  { id: "private_employer", labelKey: "cpOrgPrivate" },
  { id: "contractor", labelKey: "cpOrgContractor" },
  { id: "government_department", labelKey: "cpOrgGov" },
  { id: "welfare_board", labelKey: "cpOrgWelfare" },
  { id: "other", labelKey: "cpOrgOther" },
  { id: "unknown", labelKey: "cpOrgSkip" },
];

type Step = "complaint" | "details" | "result";

export default function ComplaintPortalPage() {
  const { t, lang } = useLanguage();
  const { profile } = useProfile();
  const occLabel = profile.primaryOccupation
    ? t(getOccupation(profile.primaryOccupation).nameKey)
    : "";

  const [step, setStep] = useState<Step>("complaint");
  const [complaint, setComplaint] = useState("");
  const [occupation, setOccupation] = useState(occLabel);
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [organisationType, setOrganisationType] =
    useState<OrganisationType>("unknown");
  const [organisationName, setOrganisationName] = useState("");
  const [contacted, setContacted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintPortalResult | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");

  const progress = useMemo(() => {
    if (step === "complaint") return 33;
    if (step === "details") return 66;
    return 100;
  }, [step]);

  async function runRoute(extra?: {
    organisationType?: OrganisationType;
    state?: string;
    followUpNote?: string;
  }) {
    const text = complaint.trim();
    if (!text) {
      setError(t("cpNeedComplaint"));
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const mergedComplaint = extra?.followUpNote
      ? `${text}\n\nExtra detail: ${extra.followUpNote}`
      : text;

    const res = await callComplaintPortal({
      lang,
      facts: {
        complaint: mergedComplaint,
        occupation: occupation.trim() || undefined,
        state: (extra?.state ?? state).trim() || undefined,
        district: district.trim() || undefined,
        organisationType: extra?.organisationType ?? organisationType,
        organisationName: organisationName.trim() || undefined,
        contactedOrganisation: contacted,
      },
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      setStep("result");
      return;
    }
    setResult(res);
    setStep("result");
  }

  function onStartAgain() {
    setStep("complaint");
    setComplaint("");
    setState("");
    setDistrict("");
    setOrganisationType("unknown");
    setOrganisationName("");
    setContacted(null);
    setFollowUpAnswer("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("cpTitle")}
      </h1>
      <p className="text-base ks-muted">{t("cpBody")}</p>

      <div
        className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-[var(--line)]"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("cpProgress")}
      >
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm font-semibold text-[var(--brand-deep)]">
        {t("cpProgress")}: {progress}%
      </p>

      {step === "complaint" && (
        <section className="ks-card space-y-3 p-4">
          <label>
            <span className="ks-label">{t("cpWhatHappened")}</span>
            <textarea
              className="ks-textarea min-h-36 text-base"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder={t("cpWhatPh")}
              rows={5}
            />
          </label>
          <VoiceInput
            onTranscript={(text) =>
              setComplaint((prev) => (prev ? `${prev.trim()} ${text}` : text))
            }
          />
          <button
            type="button"
            className="ks-btn ks-btn-primary min-h-14 w-full text-base"
            disabled={!complaint.trim()}
            onClick={() => setStep("details")}
          >
            {t("cpContinue")}
          </button>
        </section>
      )}

      {step === "details" && (
        <section className="ks-card space-y-3 p-4">
          <p className="text-sm ks-muted">{t("cpOptionalHint")}</p>
          <label>
            <span className="ks-label">{t("cpOccupation")}</span>
            <input
              className="ks-input text-base"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder={t("cpOccupationPh")}
            />
          </label>
          <label>
            <span className="ks-label">{t("cpState")}</span>
            <input
              className="ks-input text-base"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder={t("cpStatePh")}
            />
          </label>
          <label>
            <span className="ks-label">{t("cpDistrict")}</span>
            <input
              className="ks-input text-base"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder={t("cpDistrictPh")}
            />
          </label>
          <div>
            <p className="ks-label">{t("cpWhoInvolved")}</p>
            <div className="mt-2 grid gap-2">
              {ORG_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`ks-btn min-h-12 w-full justify-start rounded-2xl px-4 text-left text-base ${
                    organisationType === o.id
                      ? "ks-btn-primary"
                      : "ks-btn-secondary"
                  }`}
                  aria-pressed={organisationType === o.id}
                  onClick={() => setOrganisationType(o.id)}
                >
                  {t(o.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <label>
            <span className="ks-label">{t("cpOrgName")}</span>
            <input
              className="ks-input text-base"
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
              placeholder={t("cpOrgNamePh")}
            />
          </label>
          <div>
            <p className="ks-label">{t("cpContacted")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  [true, "cpContactedYes"],
                  [false, "cpContactedNo"],
                  [null, "cpContactedSkip"],
                ] as const
              ).map(([val, key]) => (
                <button
                  key={key}
                  type="button"
                  className={`ks-btn min-h-12 rounded-2xl px-4 text-base ${
                    contacted === val ? "ks-btn-primary" : "ks-btn-secondary"
                  }`}
                  onClick={() => setContacted(val)}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="ks-btn ks-btn-secondary min-h-14 flex-1 text-base"
              onClick={() => setStep("complaint")}
            >
              {t("back")}
            </button>
            <button
              type="button"
              className="ks-btn ks-btn-primary min-h-14 flex-1 text-base"
              disabled={loading}
              onClick={() => void runRoute()}
            >
              {loading ? t("loading") : t("cpFindPortal")}
            </button>
          </div>
        </section>
      )}

      {step === "result" && (
        <div className="space-y-4">
          {loading && (
            <p className="text-base font-semibold">{t("loading")}</p>
          )}
          {error && (
            <p className="text-base font-semibold text-[var(--danger)]">{error}</p>
          )}
          {result?.status === "needs_information" && (
            <section className="ks-card space-y-3 p-4">
              <h2 className="text-lg font-bold text-[var(--brand-deep)]">
                {t("cpNeedMore")}
              </h2>
              <p className="text-base">{result.summary}</p>
              <p className="text-base font-semibold">{result.followUpQuestion}</p>
              <textarea
                className="ks-textarea text-base"
                value={followUpAnswer}
                onChange={(e) => setFollowUpAnswer(e.target.value)}
                rows={3}
                placeholder={t("cpFollowUpPh")}
              />
              <button
                type="button"
                className="ks-btn ks-btn-primary min-h-14 w-full text-base"
                disabled={loading || !followUpAnswer.trim()}
                onClick={() =>
                  void runRoute({ followUpNote: followUpAnswer.trim() })
                }
              >
                {loading ? t("loading") : t("cpContinue")}
              </button>
            </section>
          )}
          {result && result.status !== "needs_information" && (
            <ComplaintPortalCard
              result={result}
              onNotRight={() => {
                setStep("details");
                setResult(null);
              }}
              onMoreHelp={() => {
                setResult(null);
                setError(null);
                setStep("details");
              }}
            />
          )}
          <button
            type="button"
            className="ks-btn ks-btn-secondary min-h-12 w-full text-base"
            onClick={onStartAgain}
          >
            {t("cpStartAgain")}
          </button>
          <Link
            href="/grievance"
            className="block text-center text-base font-semibold text-[var(--brand)] underline"
          >
            {t("cpAlsoLetter")}
          </Link>
        </div>
      )}
    </div>
  );
}
