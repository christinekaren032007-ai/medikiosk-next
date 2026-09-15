# Rapha — AYUSH Patient Case-Taking Prototype

An AI-assisted, multilingual patient case-taking and clinical documentation
platform for AYUSH outpatient settings, built for SIH 2026 problem statement
**PS26047**.

Rapha is **not** an AI doctor, an emergency triage system, or a medical
record locker. It helps a patient independently provide their history
(touch, voice, English/Tamil/Hindi) and digitizes their previous medical
documents, then hands the practitioner a structured, fully editable case
sheet before the consultation. All diagnosis, treatment, and prescription
decisions are made by the practitioner — the AI only asks follow-up
questions and organizes what the patient said.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Gemini keys (see below)
npm run dev
```

Open `http://localhost:3000`. Run the Supabase migrations under
`supabase/migrations/` in order against your project before first use.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (unused server-side but kept for future client reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key used by every API route — never exposed to the browser |
| `GEMINI_API_KEY` | No | Enables adaptive follow-up questions, document extraction, voice-answer mapping, and handwriting transcription. Without it, the app still works end-to-end using clearly-labeled demo fallbacks. |
| `DOCTOR_PASSWORD` | No | If set, gates `/doctor*` and the doctor-facing API routes behind a shared password (`middleware.ts`) |

All Gemini calls happen in server-side API routes (`app/api/ai/*`) — the
key is never sent to the browser.

## Patient flow

Welcome → Language → Chief Complaint (multi-select) → Identify (demo
ABHA/guest) → Consent → History of Present Illness → AYUSH case information
(Prakriti / Vikriti / Agni / Kostha / Nidana) → Ahara-Vihara lifestyle →
Relevant medical history → Family history → AI follow-up questions →
Document upload + AI extraction + patient review/confirm → Case review with
Case Preparation % → Submit → token.

## Practitioner flow

`/doctor` case list → select patient → Overview (Case Preparation, AI
clarification list) → Case (structured AYUSH case sheet, AI follow-up
explainability) → Documents → Timeline → Follow-ups (treatment response,
lifestyle pattern) → Consultation (diagnosis/prescription — practitioner
entered only, with handwriting-to-text assist) → Consent.

## AI safety boundary

`lib/ai/gemini.ts` hard-codes the same safety rules into every prompt: no
diagnosis, no treatment/medication recommendation, no prescriptions, no
emergency triage, no severity/risk/priority scoring. "Case Preparation" is
a completeness checklist (`lib/ai/casePreparation.ts`), never a medical
severity score. There is deliberately no red-flag/emergency-alert
functionality anywhere in this app.

## Architecture

- **Frontend:** Next.js 15 (App Router) + React + TypeScript + Tailwind CSS
- **State:** Zustand (`lib/data/store.ts`), server-persisted via a kiosk
  session (`kiosk_sessions` table) rather than localStorage, so a kiosk
  reboot doesn't lose an in-progress intake
- **Backend/DB:** Supabase/PostgreSQL — `kiosk_sessions` (in-progress
  drafts) and `patients` (submitted cases), both JSON-backed for a
  fast-moving prototype; see `supabase/migrations/`
- **AI:** Gemini (`@google/generative-ai`) for adaptive follow-up
  questions, document-field extraction, voice-answer interpretation, and
  handwriting transcription — every call degrades gracefully to a clearly
  labeled demo fallback if the API key is missing or a call fails/times out
- **FHIR:** `lib/fhir/transformer.ts` produces a FHIR-shaped Bundle for
  demonstration only — explicitly tagged as simulated, not a real ABDM
  submission — showing where a real ABDM integration would plug in

## Demo data

Everything in this repository (seeded patients, demo scenarios, ABHA IDs)
is fictional and clearly labeled as simulated. This prototype is not for
real clinical use.
