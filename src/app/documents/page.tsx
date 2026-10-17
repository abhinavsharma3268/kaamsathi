"use client";

import { useState } from "react";
import { AiBadge } from "@/components/Badges";
import { useLanguage } from "@/hooks/useLanguage";
import { callAi } from "@/lib/client-ai";

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (
    file.type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv")
  ) {
    return file.text();
  }

  // Best-effort PDF text extraction without inventing content:
  // read as ArrayBuffer and pull printable strings. If empty, report honestly.
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let raw = "";
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      if (c >= 32 && c <= 126) raw += String.fromCharCode(c);
      else if (c === 10 || c === 13) raw += "\n";
      else raw += " ";
    }
    const chunks = raw.match(/\((?:\\.|[^\\)]){2,}\)/g) || [];
    const fromParens = chunks
      .map((s) => s.slice(1, -1).replace(/\\n/g, "\n").replace(/\\(.)/g, "$1"))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (fromParens.length > 40) return fromParens.slice(0, 12000);

    const fallback = raw.replace(/\s+/g, " ").trim();
    if (fallback.length > 80) return fallback.slice(0, 12000);
    throw new Error(
      "Could not extract readable text from this PDF. Please paste the text instead.",
    );
  }

  throw new Error(
    "Unsupported file type. Please upload .txt/.md/.csv/.pdf or paste text.",
  );
}

export default function DocumentsPage() {
  const { t, lang } = useLanguage();
  const [text, setText] = useState("");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setAnswer(null);
    try {
      const extracted = await extractTextFromFile(file);
      setText(extracted);
      setFileLabel(`${file.name} (${extracted.length} chars extracted)`);
    } catch (err) {
      setFileLabel(null);
      setError(err instanceof Error ? err.message : t("docsNoFile"));
    }
  }

  async function onExplain(e: React.FormEvent) {
    e.preventDefault();
    const documentText = text.trim();
    if (!documentText) {
      setError(t("docsNoFile"));
      return;
    }
    setLoading(true);
    setError(null);
    setAnswer(null);

    const res = await callAi({
      module: "documents",
      lang,
      message: "Explain this work-related document in simple language.",
      payload: {
        documentText,
        fileLabel,
        instruction:
          "Only use the provided documentText. Never invent fields that are not present.",
      },
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAnswer(res.answer + (res.disclaimer ? `\n\n${res.disclaimer}` : ""));
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleDocs")}
      </h1>
      <p className="text-sm ks-muted">{t("moduleDocsDesc")}</p>

      <form onSubmit={onExplain} className="ks-card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AiBadge />
        </div>

        <label>
          <span className="ks-label">{t("docsPaste")}</span>
          <textarea
            className="ks-textarea min-h-40"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileLabel(null);
            }}
            placeholder="Paste notice / payslip / deduction text here…"
          />
        </label>

        <label>
          <span className="ks-label">{t("docsUpload")}</span>
          <input
            className="ks-input"
            type="file"
            accept=".txt,.md,.csv,.pdf,text/plain,application/pdf"
            onChange={onFile}
          />
        </label>
        {fileLabel && <p className="text-xs font-semibold ks-muted">{fileLabel}</p>}
        <p className="text-xs ks-muted">
          Files are processed in your browser / request only for this explanation.
          Nothing is saved as a document archive.
        </p>

        <button
          type="submit"
          className="ks-btn ks-btn-primary w-full"
          disabled={loading || !text.trim()}
        >
          {loading ? t("loading") : t("docsExplain")}
        </button>

        {error && (
          <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>
        )}
        {answer && (
          <div className="whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm leading-relaxed ring-1 ring-[var(--line)]">
            {answer}
          </div>
        )}
      </form>
    </div>
  );
}
