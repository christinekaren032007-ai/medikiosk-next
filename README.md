# Rapha — Next.js Prototype

AI-powered clinical intake platform for Indian hospital OPDs. Patient kiosk
(voice + touch, adaptive interview, document digitization, red-flag
detection) feeding a doctor dashboard (queue, priority alerts, AI summary
review, FHIR demo). Runs entirely on deterministic mock data — **no external
API keys required.**

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
2. `/patient` → choose language → Start with Voice/Touch → pick demo ABHA identity
3. `/patient/consent` → I Agree
4. `/patient/history` → answer the adaptive chest-pain questions (or use the
   bottom-left **Demo Controls** panel → **Load Chest Pain** to skip straight
   to a pre-filled review with the severity-7 + breathlessness combination,
   which triggers the red-flag banner)
5. `/patient/documents` → tap the upload zone → watch the staged OCR
   simulation → discharge summary appears digitized
6. `/patient/review` → **Everything looks correct**
7. `/patient/complete` → token generated (e.g. `A-127`)
8. `/doctor` → the new patient is in the queue, priority-flagged if chest
   pain + breathlessness was reported
9. Click the patient → tabs for Overview / Clinical History / Documents /
   Timeline / AI Summary / Consent
10. Summary tab → **Confirm Summary** or **Regenerate**
11. Overview tab → **View FHIR Bundle** → formatted JSON, clearly labeled demo

The five patients listed in the brief (Ravi Kumar, Priya S, Arun K, Meena R,
Suresh P) are pre-seeded in the doctor queue on first load — Ravi Kumar and
Suresh P arrive already priority-flagged.

## Self-check against the spec

**Working:** landing page with pipeline + feature cards; full patient route
tree (`/patient`, `/consent`, `/history`, `/documents`, `/review`,
`/complete`); adaptive interview engine (`lib/ai/historyEngine.ts`) covering
chest pain, fever, diabetes follow-up, abdominal pain, breathlessness, and
all 15 AYUSH parameters in patient-friendly phrasing; red-flag engine and
visible alert with Call Staff / Continue Only With Staff Approval; document
upload with staged OCR animation and abnormal-value highlighting; AI summary
engine with the "AI-generated draft" disclaimer; doctor dashboard with
queue, priority alerts, and a 6-tab patient detail page; Confirm/Regenerate
on the AI summary; a real `lib/fhir/transformer.ts` producing a FHIR-shaped
Bundle viewable as formatted JSON; admin analytics with two Recharts
charts; i18n across the core patient-facing screens; a Zustand store
(`lib/data/store.ts`) with localStorage persistence so a refresh doesn't
lose the queue; an unobtrusive Demo Control Panel (scenario loaders + Reset
Demo + Patient/Doctor view shortcuts) tucked in the landing page's bottom
corner, not shown mid-flow.

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
- **Priority Alerts / Dashboard** are tabs within `/doctor` (client-side
  state) rather than separate routes — matches the sidebar in the spec, but
  isn't literally two URLs.
- **Accessibility** — semantic structure, focus-visible defaults, and large
  touch targets are in place; I did not do a full ARIA/keyboard-navigation
  audit.
- **PostgreSQL/Supabase-ready architecture** — the Zustand store is the
  only persistence layer (via localStorage). `lib/data/store.ts` is written
  so a real backend could replace the actions' bodies without touching any
  component, but no actual DB/schema exists.

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
