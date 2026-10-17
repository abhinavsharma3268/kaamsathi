/**
 * Deterministic extraction of work-document entities BEFORE any LLM call.
 * These facts are shown to the user and passed to Gemini as structured context.
 */

export type DocumentAmount = {
  label: string;
  valueInr: number;
  raw: string;
};

export type DocumentDate = {
  label: string;
  value: string;
  raw: string;
};

export type DocumentObligation = {
  type: "deduction" | "payment_due" | "action_required" | "status" | "identifier";
  text: string;
};

export type StructuredDocumentEntities = {
  amounts: DocumentAmount[];
  dates: DocumentDate[];
  deductionCodes: string[];
  identifiers: string[];
  obligations: DocumentObligation[];
  netPayableInr: number | null;
  grossEarningsInr: number | null;
  payoutStatus: string | null;
  period: string | null;
  summaryLines: string[];
};

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").replace(/\s/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function uniqBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/**
 * Extract structured legal/financial entities from raw document text in code.
 */
export function extractDocumentEntities(text: string): StructuredDocumentEntities {
  const source = text.replace(/\r\n/g, "\n");
  const amounts: DocumentAmount[] = [];
  const dates: DocumentDate[] = [];
  const obligations: DocumentObligation[] = [];
  const deductionCodes: string[] = [];
  const identifiers: string[] = [];

  // Amounts: Rs / ₹ / INR patterns, preferably with a nearby label on the same line
  const amountLineRe =
    /^(.{0,80}?)(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*$/gim;
  let m: RegExpExecArray | null;
  while ((m = amountLineRe.exec(source)) !== null) {
    const label = m[1].replace(/[.:=\-\s]+$/g, "").trim() || "Amount";
    const value = parseAmount(m[2]);
    if (value === null) continue;
    amounts.push({ label, valueInr: value, raw: m[0].trim() });
  }

  // Fallback loose amounts if few labeled lines found
  if (amounts.length < 2) {
    const looseRe = /(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
    while ((m = looseRe.exec(source)) !== null) {
      const value = parseAmount(m[1]);
      if (value === null) continue;
      amounts.push({
        label: "Amount",
        valueInr: value,
        raw: m[0].trim(),
      });
    }
  }

  // Dates: ISO, Indian DD/MM/YYYY, and month-name ranges
  const datePatterns: { re: RegExp; label: string }[] = [
    {
      re: /(?:period|statement period|from|dates?)[:\s-]*([0-9]{1,2}\s*[–\-to]+\s*[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/gi,
      label: "Period",
    },
    {
      re: /(?:generated on|date|dated)[:\s-]*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/gi,
      label: "Date",
    },
    {
      re: /\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b/g,
      label: "Date",
    },
    {
      re: /\b([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})\b/g,
      label: "Date",
    },
  ];
  for (const { re, label } of datePatterns) {
    while ((m = re.exec(source)) !== null) {
      dates.push({ label, value: m[1].trim(), raw: m[0].trim() });
    }
  }

  // Deduction / ticket codes
  const codeRe = /\b((?:UNIQUE_)?DED[_-]?[A-Z0-9]+|[A-Z]{2,5}-\d{3,})\b/g;
  while ((m = codeRe.exec(source)) !== null) {
    deductionCodes.push(m[1]);
  }

  // Identifiers (partner / account style)
  const idRe =
    /\b(?:Partner ID|Worker ID|Employee ID|UAN|Account)[:\s]*([A-Z0-9-]{4,})\b/gi;
  while ((m = idRe.exec(source)) !== null) {
    identifiers.push(m[1]);
  }

  // Obligations / clauses by keyword lines
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 8) continue;
    const lower = trimmed.toLowerCase();
    if (
      lower.includes("deduction") ||
      lower.includes("recover") ||
      lower.includes("fee") ||
      lower.includes("gst")
    ) {
      obligations.push({ type: "deduction", text: trimmed });
    } else if (
      lower.includes("net payable") ||
      lower.includes("pending") ||
      lower.includes("payout") ||
      lower.includes("due")
    ) {
      obligations.push({
        type: lower.includes("pending") || lower.includes("due")
          ? "payment_due"
          : "status",
        text: trimmed,
      });
    } else if (
      lower.includes("within") &&
      (lower.includes("day") || lower.includes("raise") || lower.includes("contact"))
    ) {
      obligations.push({ type: "action_required", text: trimmed });
    } else if (lower.includes("partner id") || lower.includes("employee id")) {
      obligations.push({ type: "identifier", text: trimmed });
    }
  }

  const findAmount = (...needles: string[]) => {
    const hit = amounts.find((a) =>
      needles.some((n) => a.label.toLowerCase().includes(n)),
    );
    return hit?.valueInr ?? null;
  };

  const netPayableInr =
    findAmount("net payable", "net pay", "final amount") ??
    amounts.find((a) => /net payable/i.test(a.raw))?.valueInr ??
    null;

  const grossEarningsInr =
    findAmount("gross", "subtotal earnings", "trip earnings") ?? null;

  let payoutStatus: string | null = null;
  const statusMatch = source.match(
    /payout status\s*[:\-]\s*([^\n]+)/i,
  );
  if (statusMatch) payoutStatus = statusMatch[1].trim();

  let period: string | null = null;
  const periodMatch = source.match(
    /(?:statement )?period\s*[:\-]\s*([^\n]+)/i,
  );
  if (periodMatch) period = periodMatch[1].trim();

  const uniqueAmounts = uniqBy(
    amounts,
    (a) => `${a.label.toLowerCase()}|${a.valueInr}`,
  ).slice(0, 20);
  const uniqueDates = uniqBy(dates, (d) => d.value.toLowerCase()).slice(0, 12);
  const uniqueObligations = uniqBy(obligations, (o) => o.text).slice(0, 15);

  const summaryLines: string[] = [];
  if (period) summaryLines.push(`Period: ${period}`);
  if (grossEarningsInr !== null)
    summaryLines.push(`Gross / subtotal earnings: ₹${grossEarningsInr}`);
  if (netPayableInr !== null) summaryLines.push(`Net payable: ₹${netPayableInr}`);
  if (payoutStatus) summaryLines.push(`Payout status: ${payoutStatus}`);
  if (deductionCodes.length)
    summaryLines.push(`Codes: ${[...new Set(deductionCodes)].join(", ")}`);
  if (identifiers.length)
    summaryLines.push(`IDs: ${[...new Set(identifiers)].join(", ")}`);

  return {
    amounts: uniqueAmounts,
    dates: uniqueDates,
    deductionCodes: [...new Set(deductionCodes)],
    identifiers: [...new Set(identifiers)],
    obligations: uniqueObligations,
    netPayableInr,
    grossEarningsInr,
    payoutStatus,
    period,
    summaryLines,
  };
}
