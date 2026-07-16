-- Allow multiple quizzes/assignments per lesson (drop one-per-lesson unique).
-- Add quiz_type / assignment type, sort_order, and assignment.question.

do $$ begin
  create type public.quiz_type as enum ('lesson', 'video');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.assignment_type as enum ('written', 'file');
exception
  when duplicate_object then null;
end $$;

alter table public.quizzes
  drop constraint if exists quizzes_lesson_id_key;

alter table public.quizzes
  add column if not exists quiz_type public.quiz_type not null default 'lesson'::public.quiz_type,
  add column if not exists sort_order integer not null default 0;

create index if not exists quizzes_lesson_id_type_sort_idx
  on public.quizzes using btree (lesson_id, quiz_type, sort_order);

create unique index if not exists quizzes_one_video_per_lesson_uidx
  on public.quizzes using btree (lesson_id)
  where (quiz_type = 'video'::public.quiz_type);

alter table public.assignments
  drop constraint if exists assignments_lesson_id_key;

alter table public.assignments
  add column if not exists question text not null default '',
  add column if not exists type public.assignment_type not null default 'written'::public.assignment_type,
  add column if not exists sort_order integer not null default 0;

-- Backfill question from description where empty
update public.assignments
set question = description
where question = '' and description <> '';

create index if not exists assignments_lesson_id_sort_idx
  on public.assignments using btree (lesson_id, sort_order);
