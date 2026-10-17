# Saath — Work, Rights & Support

**Challenge vertical:** Informal / gig-worker support in India (delivery partners, drivers, daily-wage workers).

**Together, by your side.** A **real GenAI** companion that talks like a person, asks only when something is missing, and never pretends a complaint was filed.

## How the assistant decides (one step at a time)

`decideNextStep()` in `src/lib/chat-decide.ts` is the whole brain:

1. **Emergency** (bleeding, attack, 112) → safety help immediately. No form delay.
2. **Hello / thanks** → a stable greeting. No Gemini call.
3. **Missing facts** (who unpaid you, are you safe, today’s numbers) → Gemini replies to *what they just said*, then a short **form**.
4. **Enough context** → do the real job: earnings math, official portal, draft letter, or rights/safety advice.

The worker stays on one topic until they finish or switch. Gemini never invents eligibility or phone numbers except 112 / 108 / 1091.

## Modules

1. **Earnings Tracker** — deterministic net / ₹-per-hour math, localStorage history, AI trend explanation  
2. **Safety Assistant** — conversational Gemini guidance; emergencies prioritize 112 / 108 / 1091 / 1930  
3. **Rights & Welfare** — Q&A with curated official source links; never claims guaranteed eligibility  
4. **Document Helper** — paste or upload text/PDF; explains only extracted content  
5. **Grievance Drafter** — editable complaint letter you can copy (app does **not** submit)

Languages: **English · हिन्दी · ਪੰਜਾਬੀ**

Brand (same name in every language): **Saath**
- English tagline: Work, Rights & Support  
- Hindi: काम, हक़ और मदद  
- Punjabi: ਕੰਮ, ਹੱਕ ਤੇ ਮਦਦ  

## Setup

```bash
cd /Users/abhinavsharma/Desktop/Pr
cp .env.example .env.local   # add GEMINI_API_KEY
npm install
npm run dev
```

## Testing

```bash
npm test              # Vitest unit + UI + mocked AI/API tests
npm run test:watch    # watch mode
```

Coverage includes:
- Earnings arithmetic and validation (`src/lib/earnings.test.ts`)
- Mailto helpers (`src/lib/mailto.test.ts`)
- i18n EN/HI/PA (`src/lib/i18n.test.ts`)
- Mocked Gemini `runAi` integration (`src/lib/ai.test.ts`)
- `/api/ai` request validation (`src/app/api/ai/route.test.ts`)
- Document entity extraction (`src/lib/document-extract.test.ts`)
- Prompt-injection guards (`src/lib/prompt-guard.test.ts`)
- Sync pack merge/export (`src/lib/sync.test.ts`)
- UI components: `CopyButton`, `ModuleCard`

### Data persistence
- **Default:** local-first (`localStorage`) for privacy on shared phones.
- **Cross-device:** Export / Import JSON backup from Earnings.
- **Optional cloud:** set `KAAMSAATHI_SYNC_URL` (+ optional `KAAMSAATHI_SYNC_TOKEN`) to enable push/pull via `/api/sync`.


Open [http://localhost:3000](http://localhost:3000)

Required env:

```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-latest
```

## Pitch (60 seconds)

**Problem:** Gig workers juggle opaque payouts, safety risks, confusing notices, and weak access to rights info — often with limited digital literacy.

**Solution:** Saath is a mobile-first companion that combines **honest arithmetic** (earnings) with **real Gemini assistance** (safety, rights, documents, grievances) in simple multilingual language.

**Architecture:** Next.js App Router → `/api/ai` (server-held Gemini key) → structured JSON validated with Zod → UI clearly labels *calculated facts* vs *AI suggestions*. Earnings persist in `localStorage`.

**Impact:** A worker can record today’s pay, ask a safety question in Hindi, check a welfare portal link, understand a deduction notice, and leave with a copy-ready complaint — without fake success states.

## Limitations (disclose to judges)

- Not legal advice; eligibility is never guaranteed.  
- PDF text extraction is best-effort; prefer paste for complex scans.  
- Grievances are **drafted only**, not filed.  
- Welfare answers may be incomplete; always verify on official sites.  
- API key must be present; failures show honest errors (no fabricated answers).

## Demo script (judges)

1. Home → **I feel unsafe at work** → Saath answers about that, then a 3-field form (safe now / what happened / who).  
2. Fill “client misbehaved” → get practical next steps, not the same question again.  
3. **New chat** → **My payment hasn’t arrived** → Gemini reply + form (who / when / amount) → official SAMADHAN link + draft message.  
4. Switch to **हिन्दी** → **आज की कमाई जोड़ें** → fill ₹1400 / 9 hours / ₹200 fuel → app math, not a guess.  
5. Type **hi** → instant greeting, no spinner.
