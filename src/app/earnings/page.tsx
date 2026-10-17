"use client";

import { useEffect, useMemo, useState } from "react";
import { AiBadge, FactBadge } from "@/components/Badges";
import { useLanguage } from "@/hooks/useLanguage";
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
import { loadEarnings, saveEarnings } from "@/lib/storage";

const emptyForm = (): EarningsInput => ({
  date: toDateKey(new Date()),
  gross: 0,
  incentives: 0,
  hours: 0,
  fuel: 0,
  maintenance: 0,
  otherExpenses: 0,
  notes: "",
});

export default function EarningsPage() {
  const { t, lang } = useLanguage();
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [form, setForm] = useState<EarningsInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(loadEarnings());
    setHydrated(true);
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
    setForm(emptyForm());
  }

  function onDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function onExplain() {
    setAiLoading(true);
    setAiError(null);
    setAiText(null);
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
    setAiText(res.answer);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleEarnings")}
      </h1>

      <section className="grid grid-cols-2 gap-3">
        <div className="ks-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <FactBadge />
            <span className="text-xs font-bold ks-muted">{t("earningsToday")}</span>
          </div>
          <p className="text-2xl font-bold">₹{summary.todayNet}</p>
          <p className="text-sm ks-muted">
            {t("earningsPerHour")}: ₹{summary.todayPerHour}
          </p>
        </div>
        <div className="ks-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <FactBadge />
            <span className="text-xs font-bold ks-muted">{t("earningsWeek")}</span>
          </div>
          <p className="text-2xl font-bold">₹{summary.weekNet}</p>
          <p className="text-sm ks-muted">
            {t("earningsPerHour")}: ₹{summary.weekPerHour}
          </p>
        </div>
      </section>

      <form onSubmit={onSave} className="ks-card space-y-3 p-4">
        <label>
          <span className="ks-label">{t("earningsDate")}</span>
          <input
            className="ks-input"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["gross", "earningsGross"],
              ["incentives", "earningsIncentives"],
              ["hours", "earningsHours"],
              ["fuel", "earningsFuel"],
              ["maintenance", "earningsMaintenance"],
              ["otherExpenses", "earningsOther"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span className="ks-label">{t(label)}</span>
              <input
                className="ks-input"
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
            className="ks-input"
            value={form.notes || ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>

        <div className="rounded-2xl bg-[var(--brand-soft)] p-3">
          <div className="mb-1">
            <FactBadge />
          </div>
          <p className="text-sm">
            {t("earningsNet")}: <strong>₹{live.net}</strong>
          </p>
          <p className="text-sm">
            {t("earningsPerHour")}: <strong>₹{live.perHour}</strong>
          </p>
        </div>

        {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}

        <button type="submit" className="ks-btn ks-btn-primary w-full">
          {t("earningsSave")}
        </button>
      </form>

      <section className="ks-card space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">{t("earningsAiExplain")}</h2>
          <AiBadge />
        </div>
        <button
          type="button"
          className="ks-btn ks-btn-secondary w-full"
          onClick={onExplain}
          disabled={aiLoading || entries.length === 0}
        >
          {aiLoading ? t("loading") : t("earningsAiExplain")}
        </button>
        {aiError && (
          <p className="text-sm font-semibold text-[var(--danger)]">{aiError}</p>
        )}
        {aiText && (
          <div className="whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm leading-relaxed ring-1 ring-[var(--line)]">
            {aiText}
          </div>
        )}
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
                    <p className="text-sm">
                      Net ₹{e.net} · ₹{e.perHour}/hr · {e.hours}h
                    </p>
                    <p className="text-xs ks-muted">
                      Gross ₹{e.gross}+₹{e.incentives} − fuel ₹{e.fuel} − maint ₹
                      {e.maintenance} − other ₹{e.otherExpenses}
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
    </div>
  );
}
