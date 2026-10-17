/** Local-only text extraction for pasted/uploaded payslips and notices. */

export async function extractTextFromFile(file: File): Promise<string> {
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
