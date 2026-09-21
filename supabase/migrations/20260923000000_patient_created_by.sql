-- Track who originally added each patient, independent of assigned_to
-- (which can change later via reassignment). Needed so admins can see which
-- sales person actually added a given patient, and how many patients each
-- person has added over time — not just how many they currently own.

alter table public.patients
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

create index if not exists patients_created_by_idx on public.patients (created_by);

-- Always stamp created_by from the authenticated caller, server-side — the
-- same pattern as set_updated_at in the initial schema. This can't be
-- spoofed by the client: the backend never reads a created_by field from
-- the request body, and this trigger overwrites whatever a caller sends.
create or replace function public.set_patients_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_patients_created_by on public.patients;
create trigger set_patients_created_by
  before insert on public.patients
  for each row execute function public.set_patients_created_by();
