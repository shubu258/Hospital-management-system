-- Admin email allowlist, self-registration profile bootstrap, and admin-only
-- delete access for patients / patient_status_history.

-- ---------------------------------------------------------------------------
-- Admin email allowlist
--
-- Anyone who signs up (via Supabase Auth) with one of these emails gets the
-- ADMIN role automatically; everyone else registers as a SALES_USER. To add
-- or remove an admin, edit this list and re-run just this CREATE OR REPLACE
-- statement — the backfill further down promotes any matching existing
-- profile too.
-- ---------------------------------------------------------------------------

create or replace function public.admin_emails()
returns text[]
language sql
immutable
as $$
  select array[
    'shivanshnigam2582@gmail.com',
    '0rishiraikwar@gmail.com'
  ];
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new Supabase Auth user is created —
-- whether that's someone self-registering from the Sales app, or an admin
-- created directly in the Supabase dashboard. The role is always derived
-- from admin_emails() here, server-side; it is never taken from client input.
--
-- SECURITY DEFINER so the insert bypasses profiles' RLS (same pattern as
-- public.current_user_role() in the RLS migration).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case
      when lower(new.email) = any (public.admin_emails()) then 'ADMIN'::public.user_role
      else 'SALES_USER'::public.user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: promote any already-existing profile whose email is in the
-- allowlist. Removing an email from the list later does NOT automatically
-- demote that profile — do that by hand if that's what you want.
update public.profiles
set role = 'ADMIN'
where lower(email) = any (public.admin_emails())
  and role <> 'ADMIN';

-- ---------------------------------------------------------------------------
-- Admin-only deletes.
--
-- Neither table had a delete policy before this, so RLS rejected every
-- delete regardless of caller — the backend now exposes:
--   DELETE /api/patients/:id                         (removes the patient
--                                                      entirely, along with
--                                                      their documents and
--                                                      status history)
--   DELETE /api/patients/:id/status-history/:entryId  (removes one mis-logged
--                                                      status change)
-- Both routes also require role = ADMIN in the backend itself; these
-- policies are the second, database-level layer of that same check.
-- ---------------------------------------------------------------------------

create policy "patients_delete_admin_only"
  on public.patients
  for delete
  to authenticated
  using (public.current_user_role() = 'ADMIN');

create policy "status_history_delete_admin_only"
  on public.patient_status_history
  for delete
  to authenticated
  using (public.current_user_role() = 'ADMIN');
