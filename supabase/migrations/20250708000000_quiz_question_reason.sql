alter table public.quiz_questions
  add column if not exists reason text not null default '';
