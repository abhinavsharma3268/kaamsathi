# KaamSaathi — Your Work Companion

PromptWars warm-up: a **real GenAI** companion for Indian gig and informal workers (delivery partners, drivers, daily-wage workers).

## Modules

1. **Earnings Tracker** — deterministic net / ₹-per-hour math, localStorage history, AI trend explanation  
2. **Safety Assistant** — conversational Gemini guidance; emergencies prioritize 112 / 108 / 1091 / 1930  
3. **Rights & Welfare** — Q&A with curated official source links; never claims guaranteed eligibility  
4. **Document Helper** — paste or upload text/PDF; explains only extracted content  
5. **Grievance Drafter** — editable complaint letter you can copy (app does **not** submit)

Languages: **English · हिन्दी · ਪੰਜਾਬੀ**

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

**Solution:** KaamSaathi is a mobile-first companion that combines **honest arithmetic** (earnings) with **real Gemini assistance** (safety, rights, documents, grievances) in simple multilingual language.

**Architecture:** Next.js App Router → `/api/ai` (server-held Gemini key) → structured JSON validated with Zod → UI clearly labels *calculated facts* vs *AI suggestions*. Earnings persist in `localStorage`.

**Impact:** A worker can record today’s pay, ask a safety question in Hindi, check a welfare portal link, understand a deduction notice, and leave with a copy-ready complaint — without fake success states.

## Limitations (disclose to judges)

- Not legal advice; eligibility is never guaranteed.  
- PDF text extraction is best-effort; prefer paste for complex scans.  
- Grievances are **drafted only**, not filed.  
- Welfare answers may be incomplete; always verify on official sites.  
- API key must be present; failures show honest errors (no fabricated answers).

## Demo script

1. Home → switch language to **हिन्दी**.  
2. **Earnings** → enter gross 1200, incentive 100, hours 8, fuel 150 → see net ₹1150 / ₹143.75/hr → Save → refresh page (persists).  
3. **Safety** → ask about fatigue after long driving.  
4. **Rights** → ask about e-Shram / insurance; open a source link.  
5. **Grievance** → delayed payment story → Generate → edit → Copy.
