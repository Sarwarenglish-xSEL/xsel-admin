-- Step 1: Add superadmin to user_role enum only.
-- PostgreSQL requires this to be committed before the new value can be used
-- in functions or constraints (error 55P04). Keep this migration separate from
-- the follow-up migration that updates is_staff() / is_admin().

do $$ begin
  alter type public.user_role add value 'superadmin';
exception
  when duplicate_object then null;
end $$;
