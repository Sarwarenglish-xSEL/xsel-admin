-- Step 2: Manager module column and staff/admin helpers (run after enum migration).

alter table public.profiles
  add column if not exists allowed_modules text[] not null default '{}'::text[];

comment on column public.profiles.allowed_modules is
  'Module keys a manager may access in the admin portal (empty for non-managers).';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('superadmin', 'admin', 'manager')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('superadmin', 'admin')
$$;
