-- Course batches: group enrollments by cohort/run per course

do $$ begin
  create type public.batch_status as enum ('upcoming', 'active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.course_batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  start_date timestamptz,
  end_date timestamptz,
  registration_deadline timestamptz,
  status public.batch_status not null default 'upcoming',
  max_seats integer check (max_seats is null or max_seats > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_batches_course_id on public.course_batches(course_id);
create index if not exists idx_course_batches_status on public.course_batches(status);

drop trigger if exists course_batches_touch_updated_at on public.course_batches;
create trigger course_batches_touch_updated_at
before update on public.course_batches
for each row execute function public.touch_updated_at();

-- Link enrollments and purchases to batches
alter table public.course_enrollments
  add column if not exists batch_id uuid references public.course_batches(id) on delete cascade;

alter table public.purchases
  add column if not exists batch_id uuid references public.course_batches(id) on delete set null;

create index if not exists idx_course_enrollments_batch_id on public.course_enrollments(batch_id);
create index if not exists idx_purchases_batch_id on public.purchases(batch_id);

-- Migrate existing enrollments into a default batch per course
insert into public.course_batches (course_id, name, start_date, registration_deadline, status)
select
  c.id,
  coalesce(
    case
      when c.course_start_date is not null then
        'Batch — ' || to_char(c.course_start_date at time zone 'UTC', 'Mon YYYY')
      else null
    end,
    'Batch 1'
  ),
  c.course_start_date,
  c.registration_deadline,
  case
    when c.course_start_date is not null and c.course_start_date > now() then 'upcoming'::public.batch_status
    when c.course_start_date is not null and c.course_start_date <= now() then 'active'::public.batch_status
    else 'active'::public.batch_status
  end
from public.courses c
where exists (
  select 1 from public.course_enrollments e where e.course_id = c.id and e.batch_id is null
)
and not exists (
  select 1 from public.course_batches b where b.course_id = c.id
);

update public.course_enrollments e
set batch_id = b.id
from public.course_batches b
where e.course_id = b.course_id
  and e.batch_id is null
  and b.id = (
    select b2.id from public.course_batches b2
    where b2.course_id = e.course_id
    order by b2.created_at asc
    limit 1
  );

-- Replace course-level uniqueness with batch-level uniqueness
alter table public.course_enrollments
  drop constraint if exists course_enrollments_user_id_course_id_key;

alter table public.course_enrollments
  add constraint course_enrollments_user_id_batch_id_key unique (user_id, batch_id);

-- RLS
alter table public.course_batches enable row level security;

drop policy if exists "Anyone can read batches of published courses" on public.course_batches;
create policy "Anyone can read batches of published courses"
on public.course_batches for select
using (
  exists (
    select 1 from public.courses c
    where c.id = course_batches.course_id
      and c.status = 'published'
  )
);

drop policy if exists "Staff manage batches" on public.course_batches;
create policy "Staff manage batches"
on public.course_batches for all
using (public.is_staff())
with check (public.is_staff());
