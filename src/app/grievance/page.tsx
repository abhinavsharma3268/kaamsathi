"use client";

import { useEffect, useMemo, useState } from "react";
import { AiBadge, WarnBadge } from "@/components/Badges";
import { CopyButton } from "@/components/CopyButton";
import { QuickActions } from "@/components/QuickActions";
import { ShowMeHow } from "@/components/ShowMeHow";
import { VoiceInput } from "@/components/VoiceInput";
import { useLanguage } from "@/hooks/useLanguage";
import { callAi } from "@/lib/client-ai";
import { buildMailto, isValidEmail, truncateForMailto } from "@/lib/mailto";
import { consumePrefill } from "@/lib/prefill";

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
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailMsg, setMailMsg] = useState<string | null>(null);

  const defaultSubject = useMemo(() => {
    const platform = form.platform.trim() || "Support";
    const amount = form.amount.trim();
    return amount
      ? `Complaint — pending payment ₹${amount} (${platform})`
      : `Complaint / grievance — ${platform}`;
  }, [form.platform, form.amount]);

  useEffect(() => {
    if (draft && !mailSubject.trim()) {
      setMailSubject(defaultSubject);
    }
  }, [draft, defaultSubject, mailSubject]);

  useEffect(() => {
    const pre = consumePrefill("grievance");
    if (pre?.value) {
      setForm((f) => ({ ...f, issue: pre.value }));
    }
  }, []);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.issue.trim()) {
      setError(t("grievanceIssue"));
      return;
    }
    setLoading(true);
    setError(null);
    setTip(null);
    setMailMsg(null);

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

    const nextDraft = res.draft || res.answer;
    setDraft(nextDraft);
    setTip(res.simpleAnswer || res.answer);
    setMailSubject(defaultSubject);
  }

  function openMailApp() {
    setMailMsg(null);
    if (!draft.trim()) {
      setMailMsg(t("grievanceMailNeedDraft"));
      return;
    }
    if (!isValidEmail(mailTo)) {
      setMailMsg(t("grievanceMailNeedTo"));
      return;
    }

    const { body, truncated } = truncateForMailto(draft);
    if (truncated) {
      void navigator.clipboard.writeText(draft).catch(() => undefined);
    }

    const href = buildMailto(
      mailTo.trim(),
      mailSubject.trim() || defaultSubject,
      body,
    );
    window.location.href = href;
  }

  function applyQuick(id: string, value: string) {
    if (id === "unpaid") {
      setForm((f) => ({
        ...f,
        issue: value,
        outcome: f.outcome || "Please pay the pending wages with a clear payment breakdown.",
      }));
    } else if (id === "deduction") {
      setForm((f) => ({
        ...f,
        issue: value,
        outcome:
          f.outcome ||
          "Please explain each deduction and reverse any incorrect cuts.",
      }));
    } else if (id === "deactivated") {
      setForm((f) => ({
        ...f,
        issue: value,
        outcome:
          f.outcome ||
          "Please restore my account or explain the reason and how to appeal.",
      }));
    } else {
      setForm((f) => ({ ...f, issue: value }));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleGrievance")}
      </h1>
      <p className="text-base ks-muted">{t("moduleGrievanceDesc")}</p>

      <div className="flex flex-wrap gap-2">
        <WarnBadge>{t("grievanceNotSubmitted")}</WarnBadge>
        <AiBadge />
      </div>

      <ShowMeHow
        topicId="prepare_grievance"
        context={
          form.issue.trim()
            ? {
                workerIssueDraft: form.issue.trim().slice(0, 500),
                platformOrEmployer: form.platform.trim() || undefined,
              }
            : undefined
        }
      />

      <div className="ks-card space-y-3 p-4">
        <QuickActions
          title={t("quickTitle")}
          actions={[
            {
              id: "unpaid",
              label: t("qaUnpaid"),
              value:
                "My wages / payout for completed work have not been paid. I want a clear written complaint asking for payment.",
            },
            {
              id: "deduction",
              label: t("qaDeduction"),
              value:
                "Unexpected deductions were taken from my pay without a clear explanation. I want them explained and corrected if wrong.",
            },
            {
              id: "deactivated",
              label: t("qaDeactivated"),
              value:
                "My work account was blocked or deactivated. I need a fair explanation and a way to appeal or restore access.",
            },
          ]}
          onSelect={(value, id) => applyQuick(id, value)}
        />
      </div>

      <form onSubmit={onGenerate} className="ks-card space-y-3 p-4">
        <label>
          <span className="ks-label">{t("grievanceIssue")}</span>
          <textarea
            className="ks-textarea text-base"
            value={form.issue}
            onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))}
            required
            placeholder={t("grievanceIssuePh")}
            rows={4}
          />
        </label>
        <VoiceInput
          disabled={loading}
          onTranscript={(text) =>
            setForm((f) => ({
              ...f,
              issue: f.issue ? `${f.issue.trim()} ${text}` : text,
            }))
          }
        />
        <label>
          <span className="ks-label">{t("grievancePlatform")}</span>
          <input
            className="ks-input text-base"
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            placeholder={t("grievancePlatformPh")}
          />
        </label>
        <label>
          <span className="ks-label">{t("grievanceDates")}</span>
          <input
            className="ks-input text-base"
            value={form.dates}
            onChange={(e) => setForm((f) => ({ ...f, dates: e.target.value }))}
            placeholder={t("grievanceDatesPh")}
          />
        </label>
        <label>
          <span className="ks-label">{t("grievanceAmount")}</span>
          <input
            className="ks-input text-base"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            inputMode="decimal"
            placeholder={t("grievanceAmountPh")}
          />
        </label>
        <label>
          <span className="ks-label">{t("grievanceOutcome")}</span>
          <input
            className="ks-input text-base"
            value={form.outcome}
            onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
            placeholder={t("grievanceOutcomePh")}
          />
        </label>

        <button
          type="submit"
          className="ks-btn ks-btn-primary min-h-14 w-full text-base"
          disabled={loading || !form.issue.trim()}
        >
          {loading ? t("loading") : t("grievanceGenerate")}
        </button>
        {error && (
          <p className="text-base font-semibold text-[var(--danger)]">{error}</p>
        )}
      </form>

      {draft && (
        <section className="ks-card space-y-3 p-4">
          <p className="text-base font-semibold text-[var(--warn)]">
            {t("grievanceEditHint")}
          </p>
          {tip && tip !== draft && (
            <p className="whitespace-pre-wrap text-base ks-muted">{tip}</p>
          )}
          <label>
            <span className="ks-label">{t("grievanceDraftLabel")}</span>
            <textarea
              className="ks-textarea min-h-56 text-base"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <CopyButton text={draft} />

          <div className="mt-2 space-y-3 rounded-2xl bg-[var(--brand-soft)] p-4 ring-1 ring-[var(--line)]">
            <h2 className="font-bold text-[var(--brand-deep)]">
              {t("grievanceMailTitle")}
            </h2>
            <p className="text-sm ks-muted">{t("grievanceMailHint")}</p>
            <label>
              <span className="ks-label">{t("grievanceMailTo")}</span>
              <input
                className="ks-input text-base"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="support@example.com"
                value={mailTo}
                onChange={(e) => setMailTo(e.target.value)}
              />
            </label>
            <label>
              <span className="ks-label">{t("grievanceMailSubject")}</span>
              <input
                className="ks-input text-base"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                placeholder={defaultSubject}
              />
            </label>
            <button
              type="button"
              className="ks-btn ks-btn-primary min-h-14 w-full text-base"
              onClick={openMailApp}
            >
              {t("grievanceMailOpen")}
            </button>
            {mailMsg && (
              <p className="text-base font-semibold text-[var(--danger)]">{mailMsg}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
