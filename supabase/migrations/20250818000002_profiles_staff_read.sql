-- Allow superadmin/admin (is_admin) and staff (is_staff) to read all profiles.
-- The mobile app schema typically only lets users read their own row.

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Staff read all profiles" on public.profiles;
create policy "Staff read all profiles"
  on public.profiles for select
  using (public.is_staff());
