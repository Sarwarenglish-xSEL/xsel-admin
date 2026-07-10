-- Allow admin-created reviews without a linked user profile
alter table public.course_reviews
  alter column user_id drop not null;

alter table public.course_reviews
  add column if not exists reviewer_name text;

alter table public.course_reviews
  drop constraint if exists course_reviews_user_id_course_id_key;

create unique index if not exists idx_course_reviews_user_course
  on public.course_reviews (user_id, course_id)
  where user_id is not null;

alter table public.course_reviews
  drop constraint if exists course_reviews_reviewer_check;

alter table public.course_reviews
  add constraint course_reviews_reviewer_check
  check (
    user_id is not null
    or (reviewer_name is not null and length(trim(reviewer_name)) > 0)
  );
