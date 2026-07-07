-- PostgREST requires explicit grants on new tables. RLS policies alone are not enough.
-- Without these, admin queries that join course_batches (enrollments, purchases, etc.) fail.

grant select on table public.course_batches to anon, authenticated;
grant insert, update, delete on table public.course_batches to authenticated;
