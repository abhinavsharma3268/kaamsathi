"use client";

import { useEffect, useMemo, useState } from "react";
import { AiBadge, FactBadge } from "@/components/Badges";
import { QuickActions } from "@/components/QuickActions";
import { ShowMeHow } from "@/components/ShowMeHow";
import { StructuredAnswer } from "@/components/StructuredAnswer";
import { VoiceInput } from "@/components/VoiceInput";
import { useLanguage } from "@/hooks/useLanguage";
import { callAi } from "@/lib/client-ai";
import { extractDocumentEntities } from "@/lib/document-extract";
import { consumePrefill } from "@/lib/prefill";

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

const SAMPLE_PDF = "/samples/kaamsaathi-sample-payslip.pdf";
const SAMPLE_TXT = "/samples/kaamsaathi-sample-payslip.txt";

export default function DocumentsPage() {
  const { t, lang } = useLanguage();
  const [text, setText] = useState("");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [simpleAnswer, setSimpleAnswer] = useState<string | null>(null);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleHint, setSampleHint] = useState<string | null>(null);

  const entities = useMemo(
    () => (text.trim() ? extractDocumentEntities(text) : null),
    [text],
  );

  useEffect(() => {
    const pre = consumePrefill("documents");
    if (pre?.value) {
      setText(pre.value);
      setFileLabel("from home quick action (editable)");
    }
  }, []);

  async function loadSampleText() {
    setError(null);
    setSimpleAnswer(null);
    try {
      const res = await fetch(SAMPLE_TXT);
      if (!res.ok) throw new Error("Could not load sample file.");
      const sample = await res.text();
      setText(sample);
      setFileLabel("saath-sample-payslip.txt (loaded)");
      setSampleHint(t("docsSampleLoaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("docsNoFile"));
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setSimpleAnswer(null);
    try {
      const extracted = await extractTextFromFile(file);
      setText(extracted);
      setFileLabel(`${file.name} (${extracted.length} chars extracted)`);
    } catch (err) {
      setFileLabel(null);
      setError(err instanceof Error ? err.message : t("docsNoFile"));
    }
  }

  async function explain(documentText: string) {
    const trimmed = documentText.trim();
    if (!trimmed) {
      setError(t("docsNoFile"));
      return;
    }
    setLoading(true);
    setError(null);
    setSimpleAnswer(null);
    setNextSteps([]);
    setDisclaimer(null);

    const structuredEntities = extractDocumentEntities(trimmed);
    const res = await callAi({
      module: "documents",
      lang,
      message: "Explain this work-related document in simple language.",
      payload: {
        documentText: trimmed,
        fileLabel,
        structuredEntities,
        instruction:
          "Prefer structuredEntities extracted in application code. Never invent fields absent from structuredEntities and documentText. Use short everyday words.",
      },
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSimpleAnswer(res.simpleAnswer || res.answer);
    setNextSteps(res.nextSteps || []);
    setDisclaimer(res.disclaimer || null);
  }

  async function onExplain(e: React.FormEvent) {
    e.preventDefault();
    await explain(text);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-deep)]">
        {t("moduleDocs")}
      </h1>
      <p className="text-base ks-muted">{t("moduleDocsDesc")}</p>

      <ShowMeHow
        topicId="wage_deductions"
        context={
          text.trim()
            ? {
                documentPreview: text.trim().slice(0, 1500),
                structuredEntities: entities,
              }
            : undefined
        }
      />

      <div className="ks-card space-y-3 p-4">
        <QuickActions
          title={t("quickTitle")}
          actions={[
            {
              id: "deduction",
              label: t("qaDeduction"),
              value:
                "PAYSLIP / PAYMENT NOTE\nGross pay: ₹4,200\nUnexpected platform fee: −₹650\nPenalty / quality cut: −₹300\nNet credited: ₹3,250\nNo clear reason given for the cuts.\n\nPlease explain these deductions in simple words and what I can do next.",
            },
            {
              id: "unpaid",
              label: t("qaUnpaid"),
              value:
                "PAYMENT STATUS MESSAGE\nCompleted trips/orders this week: 38\nExpected payout: ₹5,800\nStatus: Pending / On hold\nNo payment received yet.\n\nExplain what this means and what steps I can take.",
            },
          ]}
          onSelect={(value) => {
            setText(value);
            setFileLabel("quick-action example (editable)");
            setSampleHint(null);
          }}
        />
        <p className="text-sm ks-muted">
          Edit the text if needed, then tap “{t("docsExplain")}”.
        </p>
      </div>

      <section className="ks-card space-y-3 border-l-4 border-l-[var(--brand)] p-4">
        <h2 className="font-bold text-[var(--brand-deep)]">{t("docsSampleTitle")}</h2>
        <p className="text-sm ks-muted">{t("docsSampleBody")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            className="ks-btn ks-btn-secondary min-h-14"
            href={SAMPLE_PDF}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            {t("docsSamplePdf")}
          </a>
          <a
            className="ks-btn ks-btn-secondary min-h-14"
            href={SAMPLE_TXT}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            {t("docsSampleTxt")}
          </a>
          <button
            type="button"
            className="ks-btn ks-btn-primary min-h-14"
            onClick={loadSampleText}
          >
            {t("docsLoadSample")}
          </button>
        </div>
        {sampleHint && (
          <p className="text-base font-semibold text-[var(--ok)]">{sampleHint}</p>
        )}
      </section>

      <form onSubmit={onExplain} className="ks-card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AiBadge />
        </div>

        <label>
          <span className="ks-label">{t("docsPaste")}</span>
          <textarea
            className="ks-textarea min-h-40 text-base"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileLabel(null);
            }}
            placeholder={t("docsPaste")}
          />
        </label>
        <VoiceInput
          disabled={loading}
          onTranscript={(spoken) =>
            setText((prev) => (prev ? `${prev.trim()}\n${spoken}` : spoken))
          }
        />

        <label>
          <span className="ks-label">{t("docsUpload")}</span>
          <input
            className="ks-input"
            type="file"
            accept=".txt,.md,.csv,.pdf,text/plain,application/pdf"
            onChange={onFile}
          />
        </label>
        {fileLabel && <p className="text-sm font-semibold ks-muted">{fileLabel}</p>}
        <p className="text-sm ks-muted">{t("docsPrivacy")}</p>

        {entities && (
          <div className="rounded-2xl bg-[var(--brand-soft)] p-3 ring-1 ring-[var(--line)]">
            <div className="mb-2 flex items-center gap-2">
              <FactBadge />
              <span className="text-base font-bold">{t("docsEntitiesTitle")}</span>
            </div>
            {entities.summaryLines.length === 0 ? (
              <p className="text-sm ks-muted">{t("docsEntitiesEmpty")}</p>
            ) : (
              <ul className="space-y-1 text-base">
                {entities.summaryLines.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="submit"
          className="ks-btn ks-btn-primary min-h-14 w-full text-base"
          disabled={loading || !text.trim()}
        >
          {loading ? t("loading") : t("docsExplain")}
        </button>

        {error && (
          <p className="text-base font-semibold text-[var(--danger)]">{error}</p>
        )}
        {simpleAnswer && (
          <StructuredAnswer
            simpleAnswer={simpleAnswer}
            nextSteps={nextSteps}
            disclaimer={disclaimer || undefined}
          />
        )}
      </form>
    </div>
  );
}
