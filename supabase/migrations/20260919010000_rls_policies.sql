-- Row Level Security for profiles, patients, patient_status_history, patient_documents.

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.patient_status_history enable row level security;
alter table public.patient_documents enable row level security;

-- ---------------------------------------------------------------------------
-- Helper: role of the currently authenticated user.
--
-- SECURITY DEFINER, owned by the migration role (which owns public.profiles
-- and therefore is not subject to its RLS policies). This lets policies on
-- other tables check "is this user an admin?" without querying profiles
-- directly from within a profiles policy, which would recurse infinitely.
-- ---------------------------------------------------------------------------

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
--   - a user can read their own profile
--   - admins can read every profile
-- ---------------------------------------------------------------------------

create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'ADMIN'
  );

-- ---------------------------------------------------------------------------
-- patients
--   - admins can read/create/update every patient
--   - sales users can read/update only patients assigned to them, and can
--     only ever create or leave a patient assigned to themselves (so they
--     cannot assign patients to another sales user)
-- ---------------------------------------------------------------------------

create policy "patients_select_admin_or_assigned"
  on public.patients
  for select
  to authenticated
  using (
    public.current_user_role() = 'ADMIN'
    or assigned_to = auth.uid()
  );

create policy "patients_insert_admin_or_self_assigned"
  on public.patients
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'ADMIN'
    or assigned_to = auth.uid()
  );

create policy "patients_update_admin_or_assigned"
  on public.patients
  for update
  to authenticated
  using (
    public.current_user_role() = 'ADMIN'
    or assigned_to = auth.uid()
  )
  with check (
    public.current_user_role() = 'ADMIN'
    or assigned_to = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- patient_status_history
--   - admins can read every history row
--   - sales users can read history only for patients assigned to them
--   - a history row can only be inserted by the user making the change, for
--     a patient the admin manages or that is assigned to them
--   - no update/delete: history is append-only
-- ---------------------------------------------------------------------------

create policy "status_history_select_admin_or_assigned"
  on public.patient_status_history
  for select
  to authenticated
  using (
    public.current_user_role() = 'ADMIN'
    or exists (
      select 1 from public.patients p
      where p.id = patient_status_history.patient_id
        and p.assigned_to = auth.uid()
    )
  );

create policy "status_history_insert_admin_or_assigned"
  on public.patient_status_history
  for insert
  to authenticated
  with check (
    changed_by = auth.uid()
    and (
      public.current_user_role() = 'ADMIN'
      or exists (
        select 1 from public.patients p
        where p.id = patient_status_history.patient_id
          and p.assigned_to = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- patient_documents
--   - admins can read/create/delete every document
--   - sales users can read/create/delete documents only for patients
--     assigned to them
-- ---------------------------------------------------------------------------

create policy "documents_select_admin_or_assigned"
  on public.patient_documents
  for select
  to authenticated
  using (
    public.current_user_role() = 'ADMIN'
    or exists (
      select 1 from public.patients p
      where p.id = patient_documents.patient_id
        and p.assigned_to = auth.uid()
    )
  );

create policy "documents_insert_admin_or_assigned"
  on public.patient_documents
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.current_user_role() = 'ADMIN'
      or exists (
        select 1 from public.patients p
        where p.id = patient_documents.patient_id
          and p.assigned_to = auth.uid()
      )
    )
  );

create policy "documents_delete_admin_or_assigned"
  on public.patient_documents
  for delete
  to authenticated
  using (
    public.current_user_role() = 'ADMIN'
    or exists (
      select 1 from public.patients p
      where p.id = patient_documents.patient_id
        and p.assigned_to = auth.uid()
    )
  );
