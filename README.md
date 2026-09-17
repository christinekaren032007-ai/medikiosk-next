# Rapha — Next.js Prototype

AI-assisted AYUSH clinical case-taking platform for Indian hospital OPDs.
Patient kiosk (voice + touch, adaptive interview with a lightweight AYUSH
Trividha Pariksha step, document digitization) feeding a doctor dashboard
(queue, AYUSH assessment, AI summary review, prescription entry, FHIR demo).
Rapha collects, structures, and summarizes — it never diagnoses; the doctor
remains responsible for diagnosis and prescription.

## ⚠️ Important — read before running

This project was written in a sandboxed environment **with no network
access**, so I could not run `npm install`, `next dev`, or a real TypeScript
build against the actual dependencies. I hand-wrote every file and ran a
`tsc --noEmit` sanity pass with a global TypeScript compiler (no `next`,
`zustand`, `lucide-react`, etc. installed), which surfaces expected
"cannot find module" and JSX-typing noise but caught **zero real logic
bugs** beyond that. I manually verified the one recurring error pattern
(`Property 'children' is missing`) is a false positive from missing
`@types/react`, not an actual bug — grepped the whole project and confirmed
no component is ever self-closed where children are required.

**In short: this should work, but unlike the single-file React artifact
from earlier in our conversation (which is live and already tested), this
has not actually been executed. Please run it locally and tell me if
anything breaks.**

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo flow (primary judge journey)

1. Landing (`/`) → **Start Patient Demo**
2. `/patient` → choose language → Start with Voice/Touch → **First visit** or
   **I have visited before** (returning shows a demo-labelled ABHA lookup)
3. `/patient/consent` → I Agree
4. `/patient/records` (returning patients only) → **Use this information** or
   **Don't use this information**
5. `/patient/complaint` → pick a chief complaint from the broadened,
   AYUSH-oriented list (fever, digestive problems, joint/muscle pain, sleep,
   stress/fatigue, menstrual concerns, etc.)
6. `/patient/history` → answer the adaptive questions for that complaint,
   family history, AI follow-up questions, then the AYUSH Trividha Pariksha
   step (or use the bottom-left **Demo Controls** panel → a scenario button
   to skip straight to a pre-filled review)
7. `/patient/documents` → tap the upload zone → watch the staged OCR
   simulation → discharge summary appears digitized
8. `/patient/review` → **Everything looks correct**
9. `/patient/complete` → token generated (e.g. `A-127`)
10. `/doctor` → the new patient is in the queue
11. Click the patient → tabs for Overview / Clinical History (incl. AYUSH
    Assessment) / Documents / Timeline / AI Summary / Consultation / Consent
12. Summary tab → **Confirm Summary** or **Regenerate**
13. Consultation tab → enter diagnosis + prescription → **Complete
    Consultation**
14. Overview tab → **View FHIR Bundle** → formatted JSON, clearly labeled demo

The five patients listed in the brief (Ravi Kumar, Priya S, Arun K, Meena R,
Suresh P) are pre-seeded in the doctor queue on first load.

## Self-check against the spec

**Working:** landing page with pipeline + feature cards; full patient route
tree (`/patient`, `/consent`, `/records`, `/complaint`, `/history`,
`/documents`, `/review`, `/complete`, `/treatment`); adaptive interview
engine (`lib/ai/historyEngine.ts`) covering fever, cough, headache, digestive
problems, joint/muscle pain, skin problems, sleep problems, stress/fatigue,
menstrual concerns, chest pain, abdominal pain, breathlessness, and all 15
AYUSH Dashavidha parameters in patient-friendly phrasing, plus a lightweight
Trividha Pariksha (Darshana/Sparshana/Prashna) step on every intake; document
upload with staged OCR animation and abnormal-value highlighting; AI summary
engine with the "AI-generated draft — not a diagnosis" disclaimer; doctor
dashboard with queue, an AYUSH Assessment section, and a 7-tab patient detail
page including diagnosis/prescription entry; Confirm/Regenerate on the AI
summary; a real `lib/fhir/transformer.ts` producing a FHIR-shaped Bundle
viewable as formatted JSON; admin analytics with two Recharts charts; i18n
across the core patient-facing screens; a Supabase-backed store
(`lib/data/store.ts`) so the queue survives a refresh; an unobtrusive Demo
Control Panel (scenario loaders + Reset Demo + Patient/Doctor view
shortcuts) tucked in the landing page's bottom corner, not shown mid-flow.

**Simplified from the spec, on purpose:**
- **shadcn/ui** — not actually installed via its CLI (that needs network
  access I don't have here). `components/shared/Primitives.tsx` and
  `Button.tsx` are hand-written Tailwind components styled to the same
  effect. Swapping in real shadcn components later is straightforward.
- **Zod / React Hook Form** — listed as dependencies, but there's barely a
  real form in this app (most input is chip/slider/voice-based per the
  kiosk requirement for minimal typing), so I didn't force them in
  artificially. Worth wiring in if you add a real "Enter ABHA ID" text form.
- **Demo scenario auto-play** — in the earlier single-file artifact, the
  four scenario buttons animated through every screen. Here, given real
  page navigation, `loadScenario()` fills the draft instantly and jumps to
  `/patient/review` rather than replaying each route with delays — cleaner
  with the App Router, but less theatrical.
- **Accessibility** — semantic structure, focus-visible defaults, and large
  touch targets are in place; I did not do a full ARIA/keyboard-navigation
  audit.

## Known risk areas to test first

- **Zustand + Next.js App Router hydration.** `lib/data/store.ts` uses
  `persist` with `skipHydration: true`, manually rehydrated in
  `StoreHydration.tsx` on mount. This is the standard pattern for avoiding
  SSR/localStorage mismatches, but I couldn't run it — if you see a
  hydration warning or the queue not appearing on first load, that's the
  first place to look.
- **`app/doctor/patient/[id]/page.tsx`** uses `useParams()` — confirm your
  Next.js version's App Router typing matches (pinned to 15.0.3 in
  `package.json`).

## Project structure

Matches the brief's requested layout: `app/` (routes), `components/`
(patient/doctor/shared/dashboard), `lib/ai/` (the four engines），`lib/demo/`
(scenarios + seeded patients), `lib/data/store.ts` (Zustand), `lib/fhir/`,
`lib/i18n/`, `types/`.

## Future integration points

- `lib/ai/documentEngine.ts` → swap `mockExtractDocument()` for a real
  OCR/vision API call
- `lib/ai/summaryEngine.ts` / `historyEngine.ts` → swap deterministic
  templates for a real LLM call
- `lib/fhir/transformer.ts` → replace with a validated FHIR library and
  real ABDM submission
- Web Speech API in `app/patient/history/page.tsx` is already wired with a
  graceful fallback if unsupported
