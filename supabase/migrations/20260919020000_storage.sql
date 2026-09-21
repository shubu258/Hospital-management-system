-- Private storage bucket for patient documents, with RLS policies mirroring
-- the patient_documents table access rules.
--
-- Objects are stored as "<patient_id>/<random>.<ext>" so policies can derive
-- the owning patient from the object path via storage.foldername().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  10485760, -- 10MB
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy "patient_documents_storage_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (
      public.current_user_role() = 'ADMIN'
      or exists (
        select 1 from public.patients p
        where p.id::text = (storage.foldername(storage.objects.name))[1]
          and p.assigned_to = auth.uid()
      )
    )
  );

create policy "patient_documents_storage_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'patient-documents'
    and (
      public.current_user_role() = 'ADMIN'
      or exists (
        select 1 from public.patients p
        where p.id::text = (storage.foldername(storage.objects.name))[1]
          and p.assigned_to = auth.uid()
      )
    )
  );

create policy "patient_documents_storage_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (
      public.current_user_role() = 'ADMIN'
      or exists (
        select 1 from public.patients p
        where p.id::text = (storage.foldername(storage.objects.name))[1]
          and p.assigned_to = auth.uid()
      )
    )
  );
