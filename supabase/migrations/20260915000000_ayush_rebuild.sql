-- Rapha AYUSH case-taking rebuild (PS26047).
-- Removes red-flag/priority/emergency-triage concepts entirely and
-- replaces the general clinical "summary" with a structured AYUSH case
-- sheet. Case Preparation/Completeness is computed on read, not stored.

drop index if exists idx_patients_priority;

alter table patients drop column if exists priority;
alter table patients drop column if exists red_flag;

alter table patients rename column summary to case_sheet;

alter table patients add column if not exists treatment_followups jsonb not null default '[]';

alter table kiosk_sessions drop column if exists ayush_mode;
