"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { extractTextFromFile } from "@/lib/extract-file-text";
import type { ChatFormAnswers, ChatFormField } from "@/lib/chat-types";

export function ChatDetailForm({
  fields,
  onSubmit,
  disabled,
}: {
  fields: ChatFormField[];
  onSubmit: (answers: ChatFormAnswers) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [values, setValues] = useState<ChatFormAnswers>({});
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  function set(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  const filled = fields.some((f) => String(values[f.id] || "").trim());

  async function onAttach(
    fieldId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;
    setFileBusy(true);
    setFileError(null);
    try {
      const extracted = await extractTextFromFile(file);
      set(fieldId, extracted);
      setFileLabel(file.name);
    } catch (err) {
      setFileLabel(null);
      setFileError(err instanceof Error ? err.message : t("docsNoFile"));
    } finally {
      setFileBusy(false);
    }
  }

  return (
    <form
      className="mt-3 space-y-2 rounded-2xl bg-[var(--bg)] p-3 ring-1 ring-[var(--line)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!filled || disabled || fileBusy) return;
        onSubmit(values);
      }}
    >
      <p className="text-sm font-bold text-[var(--brand-deep)]">{t("formTitle")}</p>
      {fields.map((f) => (
        <div key={f.id} className="block">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t(f.labelKey)}</span>
            {f.type === "select" ? (
              <select
                className="ks-select w-full"
                value={values[f.id] || ""}
                disabled={disabled}
                onChange={(e) => set(f.id, e.target.value)}
              >
                <option value="">{t("formChoose")}</option>
                {(f.optionKeys || []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                className="ks-textarea min-h-20 w-full"
                rows={3}
                value={values[f.id] || ""}
                disabled={disabled || fileBusy}
                onChange={(e) => {
                  set(f.id, e.target.value);
                  if (f.id === "documentText") setFileLabel(null);
                }}
              />
            ) : (
              <input
                className="ks-input w-full"
                type={f.type === "number" ? "number" : "text"}
                inputMode={f.type === "number" ? "decimal" : "text"}
                value={values[f.id] || ""}
                disabled={disabled}
                onChange={(e) => set(f.id, e.target.value)}
              />
            )}
          </label>
          {f.id === "documentText" && (
            <div className="mt-2 space-y-1.5 rounded-xl bg-white p-2.5 ring-1 ring-[var(--line)]">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">
                  {t("formDocAttach")}
                </span>
                <input
                  className="ks-input w-full text-sm"
                  type="file"
                  accept=".txt,.md,.csv,.pdf,text/plain,application/pdf"
                  disabled={disabled || fileBusy}
                  onChange={(e) => void onAttach(f.id, e)}
                />
              </label>
              <p className="text-xs ks-muted">{t("formDocAttachHint")}</p>
              {fileBusy && (
                <p className="text-sm font-semibold text-[var(--brand-deep)]">
                  {t("formDocReading")}
                </p>
              )}
              {fileLabel && !fileBusy && (
                <p className="text-sm font-semibold ks-muted">{fileLabel}</p>
              )}
              {fileError && (
                <p className="text-sm font-semibold text-[var(--danger)]">
                  {fileError}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      <button
        type="submit"
        className="ks-btn ks-btn-primary min-h-11 w-full rounded-2xl"
        disabled={disabled || fileBusy || !filled}
      >
        {t("formSubmit")}
      </button>
    </form>
  );
}
