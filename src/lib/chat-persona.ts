import type {
  ChatFormAnswers,
  ChatFormField,
  ChatHistoryItem,
  ChatIntent,
} from "./chat-types";
import type { Lang } from "./i18n";

/**
 * Saath's conversational persona: one voice, deterministic phrasing,
 * and slot-checking so missing details are asked for (one question at a time)
 * before any Gemini call. Keeps the chat stable, fast and consistent.
 */

export const PERSONA_PROMPT = `
Voice: you are "Saath" — a calm friend sitting with an Indian gig or informal worker.
- Talk about what THEY just said. Use their words (the client, the payment, the road).
- 2–5 short spoken sentences, first person. No jargon, no "As an AI", no lecture.
- Never repeat a question you already asked.
- Do not ask a checklist of questions in the chat. A small form will collect missing details.
- Never invent laws, eligibility, or phone numbers except official emergencies: 112, 108, 1091.
`.trim();

export const TALK_PROMPT = `
You are Saath talking one-to-one with a worker. Reply as if you are texting them.
Rules:
- First sentence: show you heard THIS message (name the client, money, tiredness, or whatever they said).
- Then 1–3 short sentences of comfort or the next idea. Stay on their topic.
- Do not list options like "a person, the road, or tiredness" if they already answered.
- Do not ask more than one soft question. Missing facts go in a form, not in your message.
- If they are in immediate danger, tell them to call 112 / 108 now.
- Never say a complaint was filed or that they are eligible for a scheme.
Return JSON only: { "text": string }
`.trim();

type Phr = Record<Lang, string>;

const P = {
  greeting: {
    en: "Hello! I'm Saath. I'm here with you. Tell me what's happening with your work, and we'll figure out the next step together.",
    hi: "नमस्ते! मैं Saath हूँ। मैं आपके साथ हूँ। बताइए, काम में क्या हो रहा है — हम मिलकर अगला कदम समझेंगे।",
    pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ Saath ਹਾਂ। ਮੈਂ ਤੁਹਾਡੇ ਨਾਲ ਹਾਂ। ਦੱਸੋ, ਕੰਮ ਵਿੱਚ ਕੀ ਹੋ ਰਿਹਾ ਹੈ — ਅਸੀਂ ਮਿਲ ਕੇ ਅਗਲਾ ਕਦਮ ਸਮਝਾਂਗੇ।",
  },
  thanks: {
    en: "You're welcome. I'm here whenever you need me — just type what's happening.",
    hi: "कोई बात नहीं। जब भी ज़रूरत हो, मैं यहीं हूँ — बस लिखिए क्या हो रहा है।",
    pa: "ਕੋਈ ਗੱਲ ਨਹੀਂ। ਜਦੋਂ ਵੀ ਲੋੜ ਹੋਵੇ, ਮੈਂ ਇੱਥੇ ਹਾਂ — ਬੱਸ ਲਿਖੋ ਕੀ ਹੋ ਰਿਹਾ ਹੈ।",
  },
  gotDetails: {
    en: "Thanks, that helps. ",
    hi: "धन्यवाद, इससे मदद मिली। ",
    pa: "ਧੰਨਵਾਦ, ਇਸ ਨਾਲ ਮਦਦ ਮਿਲੀ। ",
  },
  askWho: {
    en: "Okay, I'm with you. First — who is this about? Tell me the app or company name (like Zomato, Swiggy, Uber) or the contractor's name.",
    hi: "ठीक है, मैं आपके साथ हूँ। पहले बताइए — यह किसके बारे में है? ऐप/कंपनी का नाम (जैसे Zomato, Swiggy, Uber) या ठेकेदार का नाम।",
    pa: "ਠੀਕ ਹੈ, ਮੈਂ ਤੁਹਾਡੇ ਨਾਲ ਹਾਂ। ਪਹਿਲਾਂ ਦੱਸੋ — ਇਹ ਕਿਸ ਬਾਰੇ ਹੈ? ਐਪ/ਕੰਪਨੀ ਦਾ ਨਾਮ (ਜਿਵੇਂ Zomato, Swiggy, Uber) ਜਾਂ ਠੇਕੇਦਾਰ ਦਾ ਨਾਮ।",
  },
  askWhenAmount: {
    en: "Got it. One more thing — when did this happen, and how much money is involved (if any)? A rough date and amount is fine.",
    hi: "समझ गया। एक बात और — यह कब हुआ, और कितने पैसे की बात है (अगर है)? अंदाज़न तारीख और रकम भी चलेगी।",
    pa: "ਸਮਝ ਗਿਆ। ਇੱਕ ਗੱਲ ਹੋਰ — ਇਹ ਕਦੋਂ ਹੋਇਆ, ਅਤੇ ਕਿੰਨੇ ਪੈਸੇ ਦੀ ਗੱਲ ਹੈ (ਜੇ ਹੈ)? ਅੰਦਾਜ਼ਨ ਤਾਰੀਖ ਤੇ ਰਕਮ ਵੀ ਚੱਲੇਗੀ।",
  },
  askSafety: {
    en: "I'm glad you told me. Are you safe right now? Tell me what's making you feel unsafe — a person, the road, tiredness, or something else.",
    hi: "अच्छा किया जो बताया। क्या आप अभी सुरक्षित हैं? बताइए किस वजह से असुरक्षित लग रहा है — कोई व्यक्ति, सड़क, थकान, या कुछ और।",
    pa: "ਚੰਗਾ ਕੀਤਾ ਜੋ ਦੱਸਿਆ। ਕੀ ਤੁਸੀਂ ਹੁਣ ਸੁਰੱਖਿਅਤ ਹੋ? ਦੱਸੋ ਕਿਸ ਕਰਕੇ ਅਸੁਰੱਖਿਅਤ ਲੱਗ ਰਿਹਾ ਹੈ — ਕੋਈ ਵਿਅਕਤੀ, ਸੜਕ, ਥਕਾਵਟ, ਜਾਂ ਕੁਝ ਹੋਰ।",
  },
  askRights: {
    en: "Happy to help with that. So I point you the right way — what work do you do (delivery, driving, construction, domestic work…) and which state are you in?",
    hi: "ज़रूर मदद करूँगा। सही रास्ता बताने के लिए — आप क्या काम करते हैं (डिलीवरी, ड्राइविंग, निर्माण, घरेलू काम…) और किस राज्य में हैं?",
    pa: "ਜ਼ਰੂਰ ਮਦਦ ਕਰਾਂਗਾ। ਸਹੀ ਰਾਹ ਦੱਸਣ ਲਈ — ਤੁਸੀਂ ਕੀ ਕੰਮ ਕਰਦੇ ਹੋ (ਡਿਲੀਵਰੀ, ਡਰਾਈਵਿੰਗ, ਉਸਾਰੀ, ਘਰੇਲੂ ਕੰਮ…) ਅਤੇ ਕਿਹੜੇ ਰਾਜ ਵਿੱਚ ਹੋ?",
  },
  askEarnings: {
    en: "Sure, let's add it up. Tell me today's numbers — total pay ₹…, bonus ₹…, hours worked …, fuel ₹… (skip anything you don't have).",
    hi: "ज़रूर, जोड़ते हैं। आज के आंकड़े बताइए — कुल कमाई ₹…, बोनस ₹…, घंटे …, पेट्रोल ₹… (जो न हो, छोड़ दें)।",
    pa: "ਜ਼ਰੂਰ, ਜੋੜਦੇ ਹਾਂ। ਅੱਜ ਦੇ ਅੰਕ ਦੱਸੋ — ਕੁੱਲ ਕਮਾਈ ₹…, ਬੋਨਸ ₹…, ਘੰਟੇ …, ਪੈਟਰੋਲ ₹… (ਜੋ ਨਾ ਹੋਵੇ, ਛੱਡ ਦਿਓ)।",
  },
  askDocument: {
    en: "Sure. Paste the text from the payslip or notice here (or the lines you don't understand), and I'll explain it in simple words.",
    hi: "ज़रूर। पेस्लिप या नोटिस का टेक्स्ट यहाँ पेस्ट करें (या जो लाइनें समझ न आएँ), मैं आसान भाषा में समझाऊँगा।",
    pa: "ਜ਼ਰੂਰ। ਪੇਸਲਿਪ ਜਾਂ ਨੋਟਿਸ ਦਾ ਟੈਕਸਟ ਇੱਥੇ ਪੇਸਟ ਕਰੋ (ਜਾਂ ਜੋ ਲਾਈਨਾਂ ਸਮਝ ਨਾ ਆਉਣ), ਮੈਂ ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸਮਝਾਵਾਂਗਾ।",
  },
  earningsResult: {
    en: "Here's today's money: after expenses you're left with ₹{net}{perHour}. I worked this out from the numbers you gave me.",
    hi: "आज का हिसाब: खर्च के बाद आपके पास ₹{net} बचे{perHour}। यह मैंने आपके दिए आंकड़ों से गिना है।",
    pa: "ਅੱਜ ਦਾ ਹਿਸਾਬ: ਖਰਚ ਤੋਂ ਬਾਅਦ ਤੁਹਾਡੇ ਕੋਲ ₹{net} ਬਚੇ{perHour}। ਇਹ ਮੈਂ ਤੁਹਾਡੇ ਦਿੱਤੇ ਅੰਕਾਂ ਤੋਂ ਗਿਣਿਆ ਹੈ।",
  },
  perHour: {
    en: " — about ₹{v} per hour",
    hi: " — लगभग ₹{v} प्रति घंटा",
    pa: " — ਲਗਭਗ ₹{v} ਪ੍ਰਤੀ ਘੰਟਾ",
  },
  earningsStep: {
    en: "Open Earnings if you want to save today's entry",
    hi: "आज की एंट्री सेव करनी हो तो कमाई पेज खोलें",
    pa: "ਅੱਜ ਦੀ ਐਂਟਰੀ ਸੇਵ ਕਰਨੀ ਹੋਵੇ ਤਾਂ ਕਮਾਈ ਪੰਨਾ ਖੋਲ੍ਹੋ",
  },
  emptyMessage: {
    en: "I'm listening — tell me what happened.",
    hi: "मैं सुन रहा हूँ — बताइए क्या हुआ।",
    pa: "ਮੈਂ ਸੁਣ ਰਿਹਾ ਹਾਂ — ਦੱਸੋ ਕੀ ਹੋਇਆ।",
  },
  portalFallback: {
    en: "Here's what I found about where you can raise this officially.",
    hi: "यह रहा — आप इसे आधिकारिक तौर पर कहाँ उठा सकते हैं।",
    pa: "ਇਹ ਰਿਹਾ — ਤੁਸੀਂ ਇਸਨੂੰ ਅਧਿਕਾਰਤ ਤੌਰ 'ਤੇ ਕਿੱਥੇ ਚੁੱਕ ਸਕਦੇ ਹੋ।",
  },
  grievanceDisclaimer: {
    en: "I don't send this letter for you — copy it and send it yourself when you're ready.",
    hi: "यह पत्र मैं आपकी ओर से नहीं भेजता — तैयार हों तो कॉपी करके खुद भेजें।",
    pa: "ਇਹ ਪੱਤਰ ਮੈਂ ਤੁਹਾਡੇ ਵੱਲੋਂ ਨਹੀਂ ਭੇਜਦਾ — ਤਿਆਰ ਹੋਵੋ ਤਾਂ ਕਾਪੀ ਕਰਕੇ ਖੁਦ ਭੇਜੋ।",
  },
} satisfies Record<string, Phr>;

export function phrase(key: keyof typeof P, lang: Lang): string {
  return P[key][lang] ?? P[key].en;
}

export function earningsText(lang: Lang, net: number, perHour: number, hours: number): string {
  const ph = hours ? phrase("perHour", lang).replace("{v}", String(perHour)) : "";
  return phrase("earningsResult", lang)
    .replace("{net}", String(net))
    .replace("{perHour}", ph);
}

/* ---------- small talk (no model call) ---------- */

const GREETING =
  /^\s*(hi|hii+|hello|hey|namaste|namaskar|sat sri akal|good (morning|afternoon|evening)|नमस्ते|नमस्कार|हैलो|हेलो|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|ਹੈਲੋ)[\s!.,]*(saath|साथ|ਸਾਥ)?[\s!.,]*$/i;
const THANKS =
  /^\s*(thanks?( you)?|thank u|thx|ok(ay)? thanks?|shukriya|dhanyavad|धन्यवाद|शुक्रिया|ਧੰਨਵਾਦ|ਸ਼ੁਕਰੀਆ)[\s!.,]*(saath|साथ|ਸਾਥ)?[\s!.,]*$/i;

export function detectSmallTalk(message: string): "greeting" | "thanks" | null {
  if (GREETING.test(message)) return "greeting";
  if (THANKS.test(message)) return "thanks";
  return null;
}

/* ---------- conversation thread (what are we talking about?) ---------- */

export type Thread = {
  intent: ChatIntent;
  /** All user text in this thread, oldest first, including the current message. */
  facts: string;
  /** How many clarifying questions Saath has already asked in this thread. */
  asked: number;
};

/**
 * Rebuilds the active thread from history: if Saath's last message was a
 * follow-up question, the worker's new message is an answer in the same topic.
 */
export function resolveThread(args: {
  history: ChatHistoryItem[];
  message: string;
  localIntent: ChatIntent;
  localConfidence: "high" | "medium" | "low";
  isEmergency: boolean;
  forcedIntent?: ChatIntent;
}): Thread {
  const { history, message } = args;
  const last = [...history].reverse().find((h) => h.role === "assistant");
  const inThread = last?.kind === "follow_up" && last.intent;

  if (!inThread || args.isEmergency) {
    return {
      intent: args.forcedIntent || args.localIntent,
      facts: message,
      asked: 0,
    };
  }

  const threadIntent = last!.intent as ChatIntent;
  // Switch topic only on a clearly different, substantial message.
  const switching =
    !args.forcedIntent &&
    args.localConfidence === "high" &&
    args.localIntent !== threadIntent &&
    (args.localIntent === "safety" || message.length > 80);
  if (args.forcedIntent && args.forcedIntent !== threadIntent) {
    return { intent: args.forcedIntent, facts: message, asked: 0 };
  }
  if (switching) {
    return { intent: args.localIntent, facts: message, asked: 0 };
  }

  // Collect this thread: walk back until an assistant message that was not a follow-up.
  const users: string[] = [];
  let asked = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.role === "assistant") {
      if (h.kind === "follow_up") asked += 1;
      else break;
    } else {
      users.unshift(h.content);
    }
  }
  users.push(message);
  return { intent: threadIntent, facts: users.join("\n"), asked };
}

/* ---------- slot checks ---------- */

const WHO =
  /\b(zomato|swiggy|uber|ola|rapido|amazon|flipkart|blinkit|zepto|dunzo|porter|urban ?company|bigbasket|instamart|meesho|shadowfax|delhivery|ecom|contractor|thekedar|employer|company|factory|shop|owner|malik|supervisor|manager|agency|builder|site)\b|ठेकेदार|मालिक|कंपनी|सुपरवाइज़र|मैनेजर|फैक्ट्री|दुकान|ਠੇਕੇਦਾਰ|ਮਾਲਕ|ਕੰਪਨੀ|ਫੈਕਟਰੀ|ਦੁਕਾਨ/i;

const WHEN_OR_AMOUNT =
  /\d|₹|\b(yesterday|today|last (week|month)|weeks?|months?|days?|since|ago|date)\b|कल|आज|दिन|हफ्ते|हफ़्ते|महीने|से|ਕੱਲ੍ਹ|ਅੱਜ|ਦਿਨ|ਹਫ਼ਤੇ|ਮਹੀਨੇ/i;

const WORK_OR_STATE =
  /\b(deliver|driver|driving|rider|cab|auto|construction|mason|labour|labor|domestic|maid|cook|security|guard|factory|farm|plumber|electrician|painter|carpenter|street vendor|hawker|tailor|salon|beautician|delhi|mumbai|maharashtra|punjab|haryana|uttar pradesh|up|bihar|rajasthan|gujarat|karnataka|bengaluru|bangalore|tamil nadu|chennai|kerala|telangana|hyderabad|andhra|west bengal|kolkata|odisha|jharkhand|chhattisgarh|madhya pradesh|mp|assam|goa|uttarakhand|himachal|jammu|chandigarh)\b|डिलीवरी|ड्राइवर|मज़दूर|मजदूर|निर्माण|घरेलू|गार्ड|फैक्ट्री|किसान|दिल्ली|मुंबई|पंजाब|हरियाणा|बिहार|राजस्थान|गुजरात|ਡਿਲੀਵਰੀ|ਡਰਾਈਵਰ|ਮਜ਼ਦੂਰ|ਉਸਾਰੀ|ਘਰੇਲੂ|ਗਾਰਡ|ਪੰਜਾਬ|ਦਿੱਲੀ|ਹਰਿਆਣਾ/i;

export function formForIntent(intent: ChatIntent): ChatFormField[] | null {
  switch (intent) {
    case "safety":
      return [
        {
          id: "safeNow",
          labelKey: "formSafeNow",
          type: "select",
          optionKeys: [
            { value: "yes", labelKey: "formSafeYes" },
            { value: "no", labelKey: "formSafeNo" },
            { value: "unsure", labelKey: "formSafeUnsure" },
          ],
        },
        { id: "whatHappened", labelKey: "formWhat", type: "textarea" },
        { id: "whoOrWhere", labelKey: "formWhoWhere", type: "text" },
      ];
    case "grievance":
    case "complaint_portal":
      return [
        { id: "who", labelKey: "formWho", type: "text" },
        { id: "when", labelKey: "formWhen", type: "text" },
        { id: "amount", labelKey: "formAmount", type: "text" },
        { id: "whatHappened", labelKey: "formWhat", type: "textarea" },
      ];
    case "rights":
      return [
        { id: "work", labelKey: "formWork", type: "text" },
        { id: "state", labelKey: "formState", type: "text" },
      ];
    case "earnings":
      return [
        { id: "gross", labelKey: "formGross", type: "number" },
        { id: "hours", labelKey: "formHours", type: "number" },
        { id: "fuel", labelKey: "formFuel", type: "number" },
        { id: "incentives", labelKey: "formBonus", type: "number" },
      ];
    case "documents":
      return [{ id: "documentText", labelKey: "formDoc", type: "textarea" }];
    default:
      return null;
  }
}

export function formatFormAnswers(answers: ChatFormAnswers): string {
  return Object.entries(answers)
    .filter(([, v]) => String(v || "").trim())
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join("\n");
}

export function needsDetailForm(args: {
  intent: ChatIntent;
  facts: string;
  asked: number;
  formSubmitted: boolean;
  isEmergency: boolean;
}): boolean {
  if (args.formSubmitted || args.isEmergency) return false;
  if (args.asked >= 1) return false;
  if (!formForIntent(args.intent)) return false;
  const f = args.facts;

  switch (args.intent) {
    case "grievance":
    case "complaint_portal":
      return !WHO.test(f) || !WHEN_OR_AMOUNT.test(f);
    case "safety":
      return f.trim().length < 80;
    case "rights":
      return f.trim().length < 50 && !WORK_OR_STATE.test(f);
    case "earnings":
      return !/\d/.test(f);
    case "documents":
      return f.trim().length < 40 && !/\d/.test(f);
    default:
      return false;
  }
}
