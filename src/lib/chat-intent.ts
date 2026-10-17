import type { ChatIntent } from "./chat-types";

const EMERGENCY =
  /\b(bleeding|assault|attacked|attack|fire|ambulance|police|112|108|1091|rape|danger now|being chased|hurt badly|emergency)\b|खतरा|हमला|खून|ਹਮਲਾ|ਖ਼ਤਰਾ|ਫਾਇਰ/i;

const SAFETY =
  /\b(unsafe|safety|tired|fatigue|sleepy|sleep while|accident|road|helmet|harass)\b|थकान|सुरक्षा|नींद|ਥਕਾਵਟ|ਸੁਰੱਖਿਆ|ਐਕਸੀਡੈਂਟ/i;

const EARNINGS =
  /\b(earn|earnings|gross|incentive|fuel|hours? worked|today.?s? pay|calculate|net pay|per hour|कमाई|वेतन)\b|ਕਮਾਈ|ਘੰਟੇ/i;

const DOCUMENTS =
  /\b(payslip|pay slip|deduction|explain (this|my)|document|slip|कटौती|पेस्लिप)\b|ਪੇਸਲਿਪ|ਕਟੌਤੀ|ਕਾਗਜ਼/i;

const GRIEVANCE =
  /\b(write (a )?complaint|draft (a )?(letter|complaint)|complaint letter|शिकायत लिख|पत्र बना)\b|ਸ਼ਿਕਾਇਤ ਲਿਖ|ਪੱਤਰ/i;

const PORTAL =
  /\b(where (to|should|can) (i )?(submit|file|complain)|complaint portal|grievance portal|samadhan|cpgrams|e-?shram|government (site|portal)|official (site|link)|शिकायत (कहाँ|वेबसाइट|पोर्टल))\b|ਸ਼ਿਕਾਇਤ ਪੋਰਟਲ|ਸਰਕਾਰੀ/i;

const RIGHTS =
  /\b(scheme|e-?shram|insurance|rights?|benefit|welfare|eligible|qualify|pm-?jay|esic)\b|योजना|अधिकार|बीमा|ਯੋਜਨਾ|ਹੱਕ|ਬੀਮਾ/i;

/** Fast local intent — skips a Gemini classify round-trip when clear. */
export function inferIntentLocal(text: string): {
  intent: ChatIntent;
  confidence: "high" | "medium" | "low";
  isEmergency: boolean;
} {
  const t = text.trim();
  if (!t) return { intent: "general", confidence: "low", isEmergency: false };

  if (EMERGENCY.test(t)) {
    return { intent: "safety", confidence: "high", isEmergency: true };
  }
  if (PORTAL.test(t)) {
    return { intent: "complaint_portal", confidence: "high", isEmergency: false };
  }
  if (GRIEVANCE.test(t)) {
    return { intent: "grievance", confidence: "high", isEmergency: false };
  }
  if (DOCUMENTS.test(t)) {
    return { intent: "documents", confidence: "high", isEmergency: false };
  }
  if (EARNINGS.test(t)) {
    return { intent: "earnings", confidence: "medium", isEmergency: false };
  }
  if (SAFETY.test(t)) {
    return { intent: "safety", confidence: "high", isEmergency: false };
  }
  if (RIGHTS.test(t)) {
    return { intent: "rights", confidence: "high", isEmergency: false };
  }

  // Unpaid / contractor often → portal or grievance
  if (/\b(unpaid|not paid|contractor|thekedar|बकाया|नहीं मिला)\b|ਬਕਾਇਆ/i.test(t)) {
    return { intent: "complaint_portal", confidence: "medium", isEmergency: false };
  }

  return { intent: "general", confidence: "low", isEmergency: false };
}

/** Pull simple money/hour figures from free text for deterministic earnings. */
export function extractEarningsNumbers(text: string): {
  gross?: number;
  incentives?: number;
  hours?: number;
  fuel?: number;
  maintenance?: number;
  otherExpenses?: number;
} {
  const pick = (re: RegExp): number | undefined => {
    const m = text.match(re);
    if (!m?.[1]) return undefined;
    const n = Number(String(m[1]).replace(/,/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    gross: pick(
      /(?:gross|earned|pay|salary|कमाई|वेतन|ਕਮਾਈ)[^\d]{0,12}(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)/i,
    ) ?? pick(/(?:₹|rs\.?\s*)(\d[\d,]*(?:\.\d+)?)/i),
    incentives: pick(
      /(?:incentive|bonus|बोनस)[^\d]{0,12}(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)/i,
    ),
    hours: pick(/(?:hours?|घंटे|ਘੰਟੇ)[^\d]{0,8}(\d+(?:\.\d+)?)/i),
    fuel: pick(/(?:fuel|petrol|डीजल|पेट्रोल|ਪੈਟਰੋਲ)[^\d]{0,12}(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)/i),
    maintenance: pick(
      /(?:maintenance|bike|repair|मरम्मत)[^\d]{0,12}(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)/i,
    ),
    otherExpenses: pick(
      /(?:other|expense|खर्च)[^\d]{0,12}(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)/i,
    ),
  };
}
