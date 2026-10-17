"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
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

  function set(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  const filled = fields.some((f) => String(values[f.id] || "").trim());

  return (
    <form
      className="mt-3 space-y-2 rounded-2xl bg-[var(--bg)] p-3 ring-1 ring-[var(--line)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!filled || disabled) return;
        onSubmit(values);
      }}
    >
      <p className="text-sm font-bold text-[var(--brand-deep)]">{t("formTitle")}</p>
      {fields.map((f) => (
        <label key={f.id} className="block">
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
              disabled={disabled}
              onChange={(e) => set(f.id, e.target.value)}
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
      ))}
      <button
        type="submit"
        className="ks-btn ks-btn-primary min-h-11 w-full rounded-2xl"
        disabled={disabled || !filled}
      >
        {t("formSubmit")}
      </button>
    </form>
  );
}
