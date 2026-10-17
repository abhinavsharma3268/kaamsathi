/** Keep mailto bodies within common mobile/desktop client limits. */
export const MAILTO_BODY_LIMIT = 1800;

export function buildMailto(to: string, subject: string, body: string): string {
  return `mailto:${to.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function truncateForMailto(body: string): {
  body: string;
  truncated: boolean;
} {
  const trimmed = body.trim();
  if (trimmed.length <= MAILTO_BODY_LIMIT) {
    return { body: trimmed, truncated: false };
  }
  return {
    body:
      trimmed.slice(0, MAILTO_BODY_LIMIT) +
      "\n\n[Message truncated for email app. Full draft was copied — paste the rest if needed.]",
    truncated: true,
  };
}
