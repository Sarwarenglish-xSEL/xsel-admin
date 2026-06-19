-- Add blocked to enrollment_status and migrate existing revoked rows
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'enrollment_status'
      and e.enumlabel = 'blocked'
  ) then
    if exists (
      select 1
      from pg_enum e
      join pg_type t on e.enumtypid = t.oid
      where t.typname = 'enrollment_status'
        and e.enumlabel = 'revoked'
    ) then
      alter type public.enrollment_status rename value 'revoked' to 'blocked';
    else
      alter type public.enrollment_status add value 'blocked';
    end if;
  end if;
end $$;

update public.course_enrollments
set status = 'blocked'
where status::text = 'revoked';
