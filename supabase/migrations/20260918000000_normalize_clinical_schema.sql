-- ============================================================
-- Rapha normalized clinical schema
--
-- Replaces the old single flat `patients` JSONB-blob table with a
-- relational patients -> consultations -> (intake_answers,
-- ayush_assessments, ai_summaries, doctor_assessments,
-- prescriptions -> medicine_reminders) structure, so the doctor
-- dashboard and patient flow read/write real relational data
-- instead of one opaque JSON column per patient.
--
-- kiosk_sessions (the in-progress, pre-submission kiosk draft) is
-- untouched — it remains the scratch space for a session that
-- hasn't been submitted as a consultation yet.
--
-- No red-flag / emergency-triage / priority / emergency-scoring
-- columns or concepts anywhere in this schema. Rapha collects,
-- structures and summarizes for the doctor — it never scores
-- urgency and never diagnoses.
-- ============================================================

create extension if not exists pgcrypto;

drop table if exists patients cascade;

-- 1. patients: one row per person. demo_abha_id is always simulated
--    for this prototype — there is no real ABDM/ABHA integration.
create table patients (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  age               integer,
  gender            text not null default '—' check (gender in ('Male', 'Female', '—')),
  phone             text,
  language          text not null default 'en' check (language in ('en', 'ta', 'hi')),
  new_or_returning  text not null default 'new' check (new_or_returning in ('new', 'returning')),
  demo_abha_id      text,
  created_at        timestamptz not null default now()
);
create index idx_patients_demo_abha_id on patients(demo_abha_id);
comment on column patients.demo_abha_id is 'Simulated ABHA ID for this SIH prototype only — no real ABDM/ABHA integration exists.';

-- 2. consultations: one row per kiosk visit / doctor queue entry.
--    `token` is the human-facing queue number shown to patient and doctor.
create table consultations (
  id                        uuid primary key default gen_random_uuid(),
  patient_id                uuid not null references patients(id) on delete cascade,
  token                     text not null unique,
  chief_complaint           text not null,
  chief_complaint_category  text not null,
  consent_given             boolean not null default false,
  consent_timestamp         timestamptz,
  consultation_status       text not null default 'Waiting' check (consultation_status in ('Waiting', 'In Consultation', 'Completed')),
  ai_status                 text not null default 'processing' check (ai_status in ('processing', 'ready')),
  documents                 jsonb not null default '[]',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index idx_consultations_patient_id on consultations(patient_id);
create index idx_consultations_status on consultations(consultation_status);
create index idx_consultations_created_at on consultations(created_at);

-- 3. intake_answers: every structured interview answer, one row each
--    (both the fixed per-complaint question flow and free-text family
--    history entries). AI follow-up Q&A lives on ai_summaries instead,
--    since it's generated together with — and reviewed alongside — the
--    summary rather than being part of the structured intake form.
create table intake_answers (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  question        text not null,
  answer          jsonb not null,
  answer_type     text not null,
  created_at      timestamptz not null default now()
);
create index idx_intake_answers_consultation_id on intake_answers(consultation_id);

-- 4. ayush_assessments: one row per consultation. `darshana`/`sparshana`/
--    `prashna` are the simplified, patient-facing Trividha Pariksha
--    capture; `dashavidha` holds the full 15-parameter Dashavidha
--    Pariksha object, populated only for AYUSH-category visits.
create table ayush_assessments (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  darshana        jsonb,
  sparshana       text,
  prashna         text,
  dashavidha      jsonb,
  created_at      timestamptz not null default now()
);
create unique index idx_ayush_assessments_consultation_id on ayush_assessments(consultation_id);

-- 5. ai_summaries: one row per consultation. `summary` is the AI-drafted
--    clinical summary (never a diagnosis); `follow_up_questions` is the
--    adaptive Q&A the AI asked during intake. `confirmed`/`confirmed_at`
--    track the doctor's sign-off on the draft.
create table ai_summaries (
  id                   uuid primary key default gen_random_uuid(),
  consultation_id      uuid not null references consultations(id) on delete cascade,
  summary              jsonb not null,
  follow_up_questions  jsonb not null default '[]',
  confirmed            boolean not null default false,
  confirmed_at         timestamptz,
  created_at           timestamptz not null default now()
);
create unique index idx_ai_summaries_consultation_id on ai_summaries(consultation_id);

-- 6. doctor_assessments: the doctor's own diagnosis and notes — never
--    AI-generated. One row per consultation, updated in place as the
--    doctor edits it.
create table doctor_assessments (
  id                       uuid primary key default gen_random_uuid(),
  consultation_id          uuid not null references consultations(id) on delete cascade,
  diagnosis                text,
  doctor_notes             text,
  additional_instructions  text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create unique index idx_doctor_assessments_consultation_id on doctor_assessments(consultation_id);

-- 7. prescriptions: one row per medicine the doctor prescribes.
create table prescriptions (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  medicine_name   text not null,
  dosage          text,
  frequency       text,
  duration        text,
  instructions    text,
  created_at      timestamptz not null default now()
);
create index idx_prescriptions_consultation_id on prescriptions(consultation_id);

-- 8. medicine_reminders: one reminder toggle per prescribed medicine,
--    set by the patient on their treatment-plan screen. One row per
--    prescription (the UI is a single on/off toggle per medicine, not
--    multiple scheduled times), so this is unique on prescription_id.
create table medicine_reminders (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  reminder_time   text,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);
create unique index idx_medicine_reminders_prescription_id on medicine_reminders(prescription_id);

-- ============================================================
-- Row Level Security
--
-- Every read/write in this app goes through Next.js server routes
-- using the Supabase service_role key (lib/supabase/server.ts) —
-- which bypasses RLS by design and is never exposed to the browser.
-- No client code uses the anon key against these tables today.
--
-- Enabling RLS with NO policies for anon/authenticated is therefore
-- the correct, minimal posture here: it denies all access to those
-- roles by default, so even if a public/anon Supabase client is ever
-- added later, it cannot read or write clinical data unless someone
-- deliberately adds a policy for it. Only the trusted server can
-- reach these tables.
-- ============================================================

alter table patients           enable row level security;
alter table consultations      enable row level security;
alter table intake_answers     enable row level security;
alter table ayush_assessments  enable row level security;
alter table ai_summaries       enable row level security;
alter table doctor_assessments enable row level security;
alter table prescriptions      enable row level security;
alter table medicine_reminders enable row level security;
