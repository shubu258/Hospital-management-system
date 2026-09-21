-- Small, fully-collaborative sales team: every sales user works every lead
-- through every stage, not just the ones assigned to them. This replaces
-- the "assigned_to = auth.uid()" restriction on patients / status history /
-- documents (table + storage) with "any authenticated user" for select,
-- insert and update. It does NOT touch:
--   - patients_delete_admin_only / status_history_delete_admin_only
--     (added in 20260922000000) — deleting a patient or a status-history
--     entry stays admin-only.
--   - patients_insert_admin_or_self_assigned — a sales user still can only
--     create a patient assigned to themselves (or leave it unassigned);
--     reassigning afterwards is still the admin-only PATCH /:id/assign route.
--   - profiles' own RLS — a directory of teammate names is exposed instead
--     through the SECURITY DEFINER function below, so sales users can
--     resolve who added/changed something without being able to read every
--     column (email, role, join date) of every profile directly.

drop policy if exists "patients_select_admin_or_assigned" on public.patients;
create policy "patients_select_authenticated"
  on public.patients
  for select
  to authenticated
  using (true);

drop policy if exists "patients_update_admin_or_assigned" on public.patients;
create policy "patients_update_authenticated"
  on public.patients
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "status_history_select_admin_or_assigned" on public.patient_status_history;
create policy "status_history_select_authenticated"
  on public.patient_status_history
  for select
  to authenticated
  using (true);

drop policy if exists "status_history_insert_admin_or_assigned" on public.patient_status_history;
create policy "status_history_insert_authenticated"
  on public.patient_status_history
  for insert
  to authenticated
  with check (changed_by = auth.uid());

drop policy if exists "documents_select_admin_or_assigned" on public.patient_documents;
create policy "documents_select_authenticated"
  on public.patient_documents
  for select
  to authenticated
  using (true);

drop policy if exists "documents_insert_admin_or_assigned" on public.patient_documents;
create policy "documents_insert_authenticated"
  on public.patient_documents
  for insert
  to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists "documents_delete_admin_or_assigned" on public.patient_documents;
create policy "documents_delete_authenticated"
  on public.patient_documents
  for delete
  to authenticated
  using (true);

drop policy if exists "patient_documents_storage_select" on storage.objects;
create policy "patient_documents_storage_select"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'patient-documents');

drop policy if exists "patient_documents_storage_insert" on storage.objects;
create policy "patient_documents_storage_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'patient-documents');

drop policy if exists "patient_documents_storage_delete" on storage.objects;
create policy "patient_documents_storage_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'patient-documents');

-- ---------------------------------------------------------------------------
-- Team directory: lets any authenticated user resolve a teammate's name
-- (for "assigned to", "added by", "changed by", "uploaded by" labels now
-- that leads are shared) without granting direct read access to the rest of
-- each profile row (email, role, created_at stay admin-only via /api/users).
-- ---------------------------------------------------------------------------

create or replace function public.team_directory()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name from public.profiles order by name;
$$;

grant execute on function public.team_directory() to authenticated;
