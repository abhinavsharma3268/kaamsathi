"use client";

import { useState } from "react";
import { AiBadge, WarnBadge } from "@/components/Badges";
import { CopyButton } from "@/components/CopyButton";
import { useLanguage } from "@/hooks/useLanguage";
import { callAi } from "@/lib/client-ai";

type FormState = {
  issue: string;
  platform: string;
  dates: string;
  amount: string;
  outcome: string;
};

const empty: FormState = {
  issue: "",
  platform: "",
  dates: "",
  amount: "",
  outcome: "",
};

export default function GrievancePage() {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState<FormState>(empty);
  const [draft, setDraft] = useState("");
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.issue.trim()) {
      setError("Please describe what happened.");
      return;
    }
    setLoading(true);
    setError(null);
    setTip(null);

    const res = await callAi({
      module: "grievance",
      lang,
      message: "Draft a respectful complaint using only the provided facts.",
      payload: {
        issue: form.issue.trim(),
        platformOrEmployer: form.platform.trim() || "Not specified",
        relevantDates: form.dates.trim() || "Not specified",
        amountInvolvedInr: form.amount.trim() || "Not specified",
        desiredOutcome: form.outcome.trim() || "Fair resolution",
        mustNotClaimSubmitted: true,
      },
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setDraft(res.draft || res.answer);
    setTip(res.answer);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleGrievance")}
      </h1>
      <p className="text-sm ks-muted">{t("moduleGrievanceDesc")}</p>

      <div className="flex flex-wrap gap-2">
        <WarnBadge>{t("grievanceNotSubmitted")}</WarnBadge>
        <AiBadge />
      </div>

      <form onSubmit={onGenerate} className="ks-card space-y-3 p-4">
        <label>
          <span className="ks-label">{t("grievanceIssue")}</span>
          <textarea
            className="ks-textarea"
            value={form.issue}
            onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))}
            required
            placeholder="e.g. Payment delayed for 12 days, incentive missing…"
          />
        </label>
        <label>
          <span className="ks-label">{t("grievancePlatform")}</span>
          <input
            className="ks-input"
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            placeholder="e.g. Swiggy / Uber / local contractor"
          />
        </label>
        <label>
          <span className="ks-label">{t("grievanceDates")}</span>
          <input
            className="ks-input"
            value={form.dates}
            onChange={(e) => setForm((f) => ({ ...f, dates: e.target.value }))}
            placeholder="e.g. 1–10 Oct 2026"
          />
        </label>
        <label>
          <span className="ks-label">{t("grievanceAmount")}</span>
          <input
            className="ks-input"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            inputMode="decimal"
            placeholder="e.g. 2450"
          />
        </label>
        <label>
          <span className="ks-label">{t("grievanceOutcome")}</span>
          <input
            className="ks-input"
            value={form.outcome}
            onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
            placeholder="e.g. Release pending payment with breakup"
          />
        </label>

        <button
          type="submit"
          className="ks-btn ks-btn-primary w-full"
          disabled={loading || !form.issue.trim()}
        >
          {loading ? t("loading") : t("grievanceGenerate")}
        </button>
        {error && (
          <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>
        )}
      </form>

      {draft && (
        <section className="ks-card space-y-3 p-4">
          <p className="text-sm font-semibold text-[var(--warn)]">
            {t("grievanceEditHint")}
          </p>
          {tip && tip !== draft && (
            <p className="text-sm ks-muted whitespace-pre-wrap">{tip}</p>
          )}
          <label>
            <span className="ks-label">Draft (editable)</span>
            <textarea
              className="ks-textarea min-h-56"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <CopyButton text={draft} />
        </section>
      )}
    </div>
  );
}
