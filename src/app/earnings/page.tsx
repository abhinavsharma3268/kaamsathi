"use client";

import { useEffect, useMemo, useState } from "react";
import { FactBadge } from "@/components/Badges";
import { StructuredAnswer } from "@/components/StructuredAnswer";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { callAi } from "@/lib/client-ai";
import {
  computeEarnings,
  createEntry,
  summarize,
  toDateKey,
  validateEarningsInput,
  type EarningsEntry,
  type EarningsInput,
} from "@/lib/earnings";
import { getOccupation } from "@/lib/occupations";
import { loadEarnings, saveEarnings } from "@/lib/storage";
import {
  buildSyncPack,
  downloadJson,
  fetchCloudSyncStatus,
  mergeEarnings,
  parseSyncPack,
  pullFromCloud,
  pushToCloud,
} from "@/lib/sync";

const emptyForm = (): EarningsInput => ({
  date: toDateKey(new Date()),
  gross: 0,
  incentives: 0,
  hours: 0,
  fuel: 0,
  maintenance: 0,
  otherExpenses: 0,
  notes: "",
  employer: "",
  workType: "",
});

type Step = "form" | "saved" | "ai";

export default function EarningsPage() {
  const { t, lang } = useLanguage();
  const { profile } = useProfile();
  const occ = getOccupation(profile.primaryOccupation);
  const labels = occ.expenseLabels;
  const [step, setStep] = useState<Step>("form");
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [form, setForm] = useState<EarningsInput>(emptyForm);
  const [lastSaved, setLastSaved] = useState<EarningsEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiSimple, setAiSimple] = useState<string | null>(null);
  const [aiNext, setAiNext] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncCloud, setSyncCloud] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  useEffect(() => {
    setEntries(loadEarnings());
    setHydrated(true);
    fetchCloudSyncStatus().then((s) => setSyncCloud(s.configured));
  }, []);

  useEffect(() => {
    if (hydrated) saveEarnings(entries);
  }, [entries, hydrated]);

  const live = useMemo(() => computeEarnings(form), [form]);
  const summary = useMemo(() => summarize(entries), [entries]);

  function setNum(key: keyof EarningsInput, value: string) {
    const n = value === "" ? 0 : Number(value);
    setForm((f) => ({ ...f, [key]: Number.isFinite(n) ? n : 0 }));
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateEarningsInput(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    const entry = createEntry(form);
    setEntries((prev) => [entry, ...prev]);
    setLastSaved(entry);
    setForm(emptyForm());
    setStep("saved");
  }

  function onDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function onExport() {
    const pack = buildSyncPack(entries);
    downloadJson(
      `saath-earnings-${toDateKey(new Date())}.json`,
      pack,
    );
    setSyncMsg(t("syncDone"));
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const raw = await file.text();
      const pack = parseSyncPack(raw);
      setEntries((prev) => mergeEarnings(prev, pack.earnings));
      setSyncMsg(t("syncDone"));
    } catch {
      setSyncMsg(t("syncFail"));
    }
  }

  async function onCloudPush() {
    setSyncBusy(true);
    setSyncMsg(null);
    const res = await pushToCloud(buildSyncPack(entries));
    setSyncBusy(false);
    setSyncMsg(res.ok ? t("syncDone") : res.error || t("syncFail"));
  }

  async function onCloudPull() {
    setSyncBusy(true);
    setSyncMsg(null);
    const res = await pullFromCloud();
    setSyncBusy(false);
    if (!res.ok) {
      setSyncMsg(res.error || t("syncFail"));
      return;
    }
    setEntries((prev) => mergeEarnings(prev, res.pack.earnings));
    setSyncMsg(t("syncDone"));
  }

  async function onExplain() {
    setAiLoading(true);
    setAiError(null);
    setAiSimple(null);
    setAiNext([]);
    setStep("ai");
    const weekEntries = entries.slice(0, 14);
    const res = await callAi({
      module: "earnings_explain",
      lang,
      message: "Explain my recent earnings and expenses in simple words.",
      payload: {
        calculatedFacts: {
          todayNet: summary.todayNet,
          weekNet: summary.weekNet,
          todayPerHour: summary.todayPerHour,
          weekPerHour: summary.weekPerHour,
          todayHours: summary.todayHours,
          weekHours: summary.weekHours,
        },
        recentEntries: weekEntries.map((e) => ({
          date: e.date,
          gross: e.gross,
          incentives: e.incentives,
          hours: e.hours,
          fuel: e.fuel,
          maintenance: e.maintenance,
          otherExpenses: e.otherExpenses,
          net: e.net,
          perHour: e.perHour,
          notes: e.notes,
        })),
      },
    });
    setAiLoading(false);
    if (!res.ok) {
      setAiError(res.error);
      return;
    }
    setAiSimple(res.simpleAnswer || res.answer);
    setAiNext(res.nextSteps || []);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleEarnings")}
      </h1>
      <p className="text-base ks-muted">{t("moduleEarningsDesc")}</p>
      <p className="text-sm font-semibold text-[var(--brand-deep)]">
        {t(occ.earningsHintKey)}
      </p>

      {step === "form" && (
        <>
      <section className="grid grid-cols-2 gap-3">
        <div className="ks-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <FactBadge />
            <span className="text-sm font-bold ks-muted">{t("earningsToday")}</span>
          </div>
          <p className="text-3xl font-bold">₹{summary.todayNet}</p>
          <p className="text-base ks-muted">
            {t("earningsPerHour")}: ₹{summary.todayPerHour}
          </p>
        </div>
        <div className="ks-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <FactBadge />
            <span className="text-sm font-bold ks-muted">{t("earningsWeek")}</span>
          </div>
          <p className="text-3xl font-bold">₹{summary.weekNet}</p>
          <p className="text-base ks-muted">
            {t("earningsPerHour")}: ₹{summary.weekPerHour}
          </p>
        </div>
      </section>

      <form onSubmit={onSave} className="ks-card space-y-4 p-4">
        <label>
          <span className="ks-label">{t("earningsDate")}</span>
          <input
            className="ks-input text-base"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
        </label>
        {(occ.showEmployer || occ.showWorkType) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {occ.showEmployer && (
              <label>
                <span className="ks-label">{t(labels.employer)}</span>
                <input
                  className="ks-input text-base"
                  value={form.employer || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, employer: e.target.value }))
                  }
                  placeholder={t("earningsEmployerPh")}
                />
              </label>
            )}
            {occ.showWorkType && (
              <label>
                <span className="ks-label">{t(labels.workType)}</span>
                <input
                  className="ks-input text-base"
                  value={form.workType || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, workType: e.target.value }))
                  }
                  placeholder={occ.workTypeSuggestions[0] || ""}
                  list="ks-work-types"
                />
                <datalist id="ks-work-types">
                  {occ.workTypeSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              ["gross", labels.gross],
              ["incentives", labels.incentives],
              ["hours", labels.hours],
              ["fuel", labels.fuel],
              ["maintenance", labels.maintenance],
              ["otherExpenses", labels.otherExpenses],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span className="ks-label">{t(label)}</span>
              <input
                className="ks-input text-lg"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form[key] || ""}
                onChange={(e) => setNum(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <label>
          <span className="ks-label">{t("earningsNotes")}</span>
          <input
            className="ks-input text-base"
            value={form.notes || ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>

        <div className="rounded-2xl bg-[var(--brand-soft)] p-4">
          <div className="mb-2">
            <FactBadge />
          </div>
          <p className="text-lg">
            {t("earningsNet")}: <strong>₹{live.net}</strong>
          </p>
          <p className="text-base">
            {t("earningsPerHour")}: <strong>₹{live.perHour}</strong>
          </p>
        </div>

        {error && <p className="text-base font-semibold text-[var(--danger)]">{error}</p>}

        <button type="submit" className="ks-btn ks-btn-primary min-h-14 w-full text-base">
          {t("earningsSave")}
        </button>
      </form>

      <section className="ks-card space-y-3 p-4">
        <h2 className="text-lg font-bold">{t("earningsAiExplain")}</h2>
        <button
          type="button"
          className="ks-btn ks-btn-secondary min-h-14 w-full text-base"
          onClick={onExplain}
          disabled={aiLoading || entries.length === 0}
        >
          {aiLoading ? t("loading") : t("earningsAiExplain")}
        </button>
      </section>

      <section className="ks-card space-y-3 p-4">
        <h2 className="font-bold">{t("syncTitle")}</h2>
        <p className="text-sm ks-muted">{t("syncBody")}</p>
        <p className="text-xs font-semibold text-[var(--brand-deep)]">
          {syncCloud ? t("syncStatusCloud") : t("syncStatusLocal")}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" className="ks-btn ks-btn-secondary" onClick={onExport}>
            {t("syncExport")}
          </button>
          <label className="ks-btn ks-btn-secondary cursor-pointer">
            {t("syncImport")}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onImportFile}
            />
          </label>
          {syncCloud && (
            <>
              <button
                type="button"
                className="ks-btn ks-btn-primary"
                disabled={syncBusy}
                onClick={onCloudPush}
              >
                {t("syncPush")}
              </button>
              <button
                type="button"
                className="ks-btn ks-btn-primary"
                disabled={syncBusy}
                onClick={onCloudPull}
              >
                {t("syncPull")}
              </button>
            </>
          )}
        </div>
        {syncMsg && <p className="text-sm font-semibold">{syncMsg}</p>}
      </section>

      <section className="ks-card p-4">
        <h2 className="mb-3 font-bold">{t("earningsHistory")}</h2>
        {entries.length === 0 ? (
          <p className="text-sm ks-muted">{t("earningsEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl bg-[var(--bg)] p-3 ring-1 ring-[var(--line)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{e.date}</p>
                    <p className="text-base">
                      {t("earningsNet")} ₹{e.net} · {t("earningsPerHour")} ₹
                      {e.perHour} · {e.hours}h
                    </p>
                    {(e.employer || e.workType) && (
                      <p className="text-sm ks-muted">
                        {[e.employer, e.workType].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="text-sm ks-muted">
                      {t(labels.gross)} ₹{e.gross} + {t(labels.incentives)} ₹
                      {e.incentives} − {t(labels.fuel)} ₹{e.fuel} −{" "}
                      {t(labels.maintenance)} ₹{e.maintenance} −{" "}
                      {t(labels.otherExpenses)} ₹{e.otherExpenses}
                    </p>
                    {e.notes && <p className="mt-1 text-xs">{e.notes}</p>}
                  </div>
                  <button
                    type="button"
                    className="text-sm font-bold text-[var(--danger)]"
                    onClick={() => onDelete(e.id)}
                  >
                    {t("earningsDelete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
        </>
      )}

      {step === "saved" && lastSaved && (
        <section className="ks-card space-y-3 p-4">
          <p className="text-base font-semibold text-[var(--ok)]">
            {t("earningsSave")} ✓
          </p>
          <div className="rounded-2xl bg-[var(--brand-soft)] p-4">
            <p className="font-bold">{lastSaved.date}</p>
            <p className="text-base">
              {t("earningsNet")} ₹{lastSaved.net} · {t("earningsPerHour")} ₹
              {lastSaved.perHour}
            </p>
          </div>
          <button
            type="button"
            className="ks-btn ks-btn-secondary min-h-12 w-full text-base"
            onClick={() => setStep("form")}
          >
            {t("back")}
          </button>
        </section>
      )}

      {step === "ai" && (
        <section className="ks-card space-y-3 p-4">
          {aiLoading && (
            <p className="text-base font-semibold text-[var(--brand-deep)]">
              {t("loading")}
            </p>
          )}
          {aiError && (
            <p className="text-base font-semibold text-[var(--danger)]">{aiError}</p>
          )}
          {!aiLoading && aiSimple && (
            <StructuredAnswer simpleAnswer={aiSimple} nextSteps={aiNext} />
          )}
          <button
            type="button"
            className="ks-btn ks-btn-secondary min-h-12 w-full text-base"
            onClick={() => {
              setStep("form");
              setAiError(null);
            }}
          >
            {t("back")}
          </button>
        </section>
      )}
    </div>
  );
}
