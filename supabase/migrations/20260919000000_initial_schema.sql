-- Initial schema for the CRM: profiles, patients, patient_status_history, patient_documents.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('ADMIN', 'SALES_USER');

create type public.patient_status as enum (
  'NEW',
  'PATIENT_REPLIED',
  'REPORT_RECEIVED',
  'TREATMENT_PLAN_SENT',
  'IN_DISCUSSION',
  'ACTIVE',
  'CLOSED'
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'SALES_USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  phone text,
  email text,
  medical_condition text,
  medical_description text,
  assigned_to uuid references public.profiles (id) on delete set null,
  status public.patient_status not null default 'NEW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_assigned_to_idx on public.patients (assigned_to);
create index patients_status_idx on public.patients (status);

-- ---------------------------------------------------------------------------
-- patient_status_history
-- ---------------------------------------------------------------------------

create table public.patient_status_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  old_status public.patient_status,
  new_status public.patient_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index patient_status_history_patient_id_idx on public.patient_status_history (patient_id);

-- ---------------------------------------------------------------------------
-- patient_documents
-- ---------------------------------------------------------------------------

create table public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index patient_documents_patient_id_idx on public.patient_documents (patient_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();
