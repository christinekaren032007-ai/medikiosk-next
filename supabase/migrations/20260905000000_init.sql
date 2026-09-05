create table kiosk_sessions (
  id           uuid primary key,
  lang         text not null default 'en',
  ayush_mode   boolean not null default false,
  draft        jsonb,
  last_token   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table patients (
  id            text primary key,
  token         text not null unique,
  name          text not null,
  age           text not null,
  gender        text not null check (gender in ('Male','Female','—')),
  abha_id       text,
  status        text not null default 'Waiting'   check (status in ('Waiting','In Consultation','Completed')),
  priority      text not null default 'normal'    check (priority in ('normal','high')),
  ai_status     text not null default 'ready'     check (ai_status in ('processing','ready')),
  history       jsonb not null,
  documents     jsonb not null default '[]',
  timeline      jsonb not null default '[]',
  summary       jsonb not null,
  red_flag      jsonb not null,
  doctor_review jsonb not null default '{"confirmed":false,"edited":false,"reviewer":null,"timestamp":null}',
  consent       jsonb not null,
  created_at    timestamptz not null default now()
);

create index idx_patients_status     on patients(status);
create index idx_patients_priority   on patients(priority);
create index idx_patients_created_at on patients(created_at);
