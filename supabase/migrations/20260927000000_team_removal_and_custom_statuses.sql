-- 1. Admins can remove team members.
-- 2. Patient statuses become admin-managed rows instead of a fixed enum.

-- ===========================================================================
-- 1. Team member removal
--
-- A removed member keeps their auth.users row (so the email stays taken and
-- can't be registered again) but is banned in Supabase Auth by the backend,
-- which blocks password and Google sign-in alike. removed_at is what the
-- backend checks on every request, so an access token issued before the
-- removal stops working immediately rather than when it expires.
-- ===========================================================================

alter table public.profiles
  add column if not exists removed_at timestamptz;

-- ===========================================================================
-- 2. Admin-managed patient statuses
--
-- `key` is a stable identifier (e.g. 'IN_DISCUSSION') that patients and
-- status history reference; it never changes. `label` is the display name
-- admins can rename freely. Removing a status that has ever been used
-- archives it (archived_at) instead of deleting it, so old history entries
-- still show its name.
-- ===========================================================================

create table public.patient_statuses (
  key text primary key check (key ~ '^[A-Z0-9_]{1,60}$'),
  label text not null check (char_length(btrim(label)) between 1 and 40),
  color text not null default 'slate' check (
    color in ('slate', 'blue', 'sky', 'indigo', 'violet', 'pink', 'rose', 'amber', 'orange', 'green', 'teal')
  ),
  position integer not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Two live statuses can't share a name; an archived one can be reused.
create unique index patient_statuses_live_label_idx
  on public.patient_statuses (lower(btrim(label)))
  where archived_at is null;

create trigger set_patient_statuses_updated_at
  before update on public.patient_statuses
  for each row execute function public.set_updated_at();

insert into public.patient_statuses (key, label, color, position) values
  ('NEW', 'New', 'blue', 1),
  ('PATIENT_REPLIED', 'Patient Replied', 'sky', 2),
  ('REPORT_RECEIVED', 'Report Received', 'amber', 3),
  ('TREATMENT_PLAN_SENT', 'Treatment Plan Sent', 'orange', 4),
  ('IN_DISCUSSION', 'In Discussion', 'indigo', 5),
  ('ACTIVE', 'Active', 'green', 6),
  ('CLOSED', 'Closed', 'slate', 7);

-- Convert the enum columns to text keys referencing the new table.
alter table public.patients alter column status drop default;
alter table public.patients
  alter column status type text using status::text;
alter table public.patient_status_history
  alter column old_status type text using old_status::text,
  alter column new_status type text using new_status::text;

alter table public.patients
  add constraint patients_status_fkey
  foreign key (status) references public.patient_statuses (key) on delete restrict;
alter table public.patient_status_history
  add constraint patient_status_history_old_status_fkey
  foreign key (old_status) references public.patient_statuses (key) on delete restrict,
  add constraint patient_status_history_new_status_fkey
  foreign key (new_status) references public.patient_statuses (key) on delete restrict;

drop type public.patient_status;

-- New patients start in the first live status (whatever the admin has put
-- first), and nothing can be moved into an archived status.
create or replace function public.check_patient_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is null then
    select key into new.status
    from public.patient_statuses
    where archived_at is null
    order by position, created_at
    limit 1;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status then
      return new;
    end if;
  end if;

  if exists (
    select 1 from public.patient_statuses
    where key = new.status and archived_at is not null
  ) then
    raise exception 'Status % has been removed', new.status using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger check_patient_status
  before insert or update of status on public.patients
  for each row execute function public.check_patient_status();

-- ---------------------------------------------------------------------------
-- RLS: everyone signed in can read statuses; only admins can change them.
-- ---------------------------------------------------------------------------

alter table public.patient_statuses enable row level security;

create policy "patient_statuses_select_authenticated"
  on public.patient_statuses
  for select
  to authenticated
  using (true);

create policy "patient_statuses_insert_admin_only"
  on public.patient_statuses
  for insert
  to authenticated
  with check (public.current_user_role() = 'ADMIN');

create policy "patient_statuses_update_admin_only"
  on public.patient_statuses
  for update
  to authenticated
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

create policy "patient_statuses_delete_admin_only"
  on public.patient_statuses
  for delete
  to authenticated
  using (public.current_user_role() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- remove_patient_status: atomically moves every patient out of a status
-- (logging a history entry for each), then deletes the status if it was
-- never used, or archives it if history still refers to it. Returns how
-- many patients were moved.
--
-- SECURITY INVOKER, so the caller's RLS applies to every statement; the
-- explicit admin check just gives a clearer error than a policy failure.
-- ---------------------------------------------------------------------------

create or replace function public.remove_patient_status(p_key text, p_move_to text)
returns integer
language plpgsql
set search_path = public
as $$
declare
  moved integer := 0;
begin
  if public.current_user_role() is distinct from 'ADMIN' then
    raise exception 'Only admins can remove statuses' using errcode = '42501';
  end if;

  perform 1 from patient_statuses where key = p_key and archived_at is null for update;
  if not found then
    raise exception 'Status not found' using errcode = 'P0002';
  end if;

  if (select count(*) from patient_statuses where archived_at is null) <= 1 then
    raise exception 'The last remaining status cannot be removed' using errcode = '23514';
  end if;

  if exists (select 1 from patients where status = p_key) then
    if p_move_to is null
       or p_move_to = p_key
       or not exists (select 1 from patient_statuses where key = p_move_to and archived_at is null) then
      raise exception 'Choose another status to move this status''s patients to' using errcode = '22023';
    end if;

    insert into patient_status_history (patient_id, old_status, new_status, changed_by)
    select id, status, p_move_to, auth.uid() from patients where status = p_key;

    update patients set status = p_move_to where status = p_key;
    get diagnostics moved = row_count;
  end if;

  if exists (
    select 1 from patient_status_history where old_status = p_key or new_status = p_key
  ) then
    update patient_statuses set archived_at = now() where key = p_key;
  else
    delete from patient_statuses where key = p_key;
  end if;

  return moved;
end;
$$;

grant execute on function public.remove_patient_status(text, text) to authenticated;

-- reorder_patient_statuses: sets the order of the live statuses in one go.
-- p_keys must list every live status exactly once.
create or replace function public.reorder_patient_statuses(p_keys text[])
returns void
language plpgsql
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'ADMIN' then
    raise exception 'Only admins can reorder statuses' using errcode = '42501';
  end if;

  if (select array_agg(key order by key) from patient_statuses where archived_at is null)
     is distinct from (select array_agg(k order by k) from unnest(p_keys) as k) then
    raise exception 'The new order must list every status exactly once' using errcode = '22023';
  end if;

  update patient_statuses s
  set position = o.ord
  from unnest(p_keys) with ordinality as o(k, ord)
  where s.key = o.k and s.position is distinct from o.ord;
end;
$$;

grant execute on function public.reorder_patient_statuses(text[]) to authenticated;
