-- Scope course content (chapters) to batches instead of courses directly

alter table public.course_chapters
  add column if not exists batch_id uuid references public.course_batches(id) on delete cascade;

-- Ensure every course with chapters has at least one batch
insert into public.course_batches (course_id, name, status)
select distinct c.id, 'Batch 1', 'active'::public.batch_status
from public.courses c
join public.course_chapters ch on ch.course_id = c.id
where ch.batch_id is null
  and not exists (
    select 1 from public.course_batches b where b.course_id = c.id
  );

-- Assign existing chapters to the earliest batch of their course
update public.course_chapters ch
set batch_id = b.id
from public.course_batches b
where ch.course_id = b.course_id
  and ch.batch_id is null
  and b.id = (
    select b2.id
    from public.course_batches b2
    where b2.course_id = ch.course_id
    order by b2.created_at asc
    limit 1
  );

create index if not exists idx_course_chapters_batch_id on public.course_chapters(batch_id);
