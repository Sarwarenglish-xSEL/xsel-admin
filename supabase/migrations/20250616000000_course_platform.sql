-- XSEL Course Platform schema (extends existing profiles from schema.sql)
-- Run after the base profiles migration in the mobile app.

-- Enums
do $$ begin
  create type public.course_type as enum ('prerecorded', 'live');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.course_category as enum ('design', 'coding', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.course_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lesson_type as enum ('video', 'live', 'quiz', 'assignment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lesson_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_status as enum ('active', 'completed', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quiz_option as enum ('a', 'b', 'c', 'd');
exception when duplicate_object then null; end $$;

-- Helper: staff = admin or manager
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'manager')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin'
$$;

-- courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  course_type public.course_type not null default 'prerecorded',
  category public.course_category not null default 'design',
  price numeric(10, 2) not null default 0,
  thumbnail_url text,
  instructor_id uuid references public.profiles(id) on delete set null,
  status public.course_status not null default 'draft',
  registration_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_courses_course_type on public.courses(course_type);
create index if not exists idx_courses_category on public.courses(category);
create index if not exists idx_courses_instructor_id on public.courses(instructor_id);

drop trigger if exists courses_touch_updated_at on public.courses;
create trigger courses_touch_updated_at
before update on public.courses
for each row execute function public.touch_updated_at();

-- course_chapters
create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_chapters_course_id on public.course_chapters(course_id);

-- course_lessons
create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  title text not null,
  lesson_type public.lesson_type not null default 'video',
  video_url text,
  live_meeting_url text,
  live_start_time timestamptz,
  live_end_time timestamptz,
  duration_seconds integer,
  sort_order integer not null default 0,
  status public.lesson_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_lessons_chapter_id on public.course_lessons(chapter_id);
create index if not exists idx_course_lessons_lesson_type on public.course_lessons(lesson_type);
create index if not exists idx_course_lessons_live_start on public.course_lessons(live_start_time)
  where lesson_type = 'live';

drop trigger if exists course_lessons_touch_updated_at on public.course_lessons;
create trigger course_lessons_touch_updated_at
before update on public.course_lessons
for each row execute function public.touch_updated_at();

-- purchases (before enrollments for FK)
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  amount numeric(10, 2) not null,
  status public.purchase_status not null default 'pending',
  receipt_url text,
  admin_note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists idx_purchases_user_id on public.purchases(user_id);
create index if not exists idx_purchases_course_id on public.purchases(course_id);
create index if not exists idx_purchases_status on public.purchases(status);

-- course_enrollments
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  status public.enrollment_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists idx_course_enrollments_user_id on public.course_enrollments(user_id);
create index if not exists idx_course_enrollments_course_id on public.course_enrollments(course_id);
create index if not exists idx_course_enrollments_status on public.course_enrollments(status);

-- quizzes
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.course_lessons(id) on delete cascade,
  title text not null,
  passing_marks integer not null default 0,
  total_marks integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists quizzes_touch_updated_at on public.quizzes;
create trigger quizzes_touch_updated_at
before update on public.quizzes
for each row execute function public.touch_updated_at();

-- quiz_questions
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option public.quiz_option not null,
  sort_order integer not null default 0
);

create index if not exists idx_quiz_questions_quiz_id on public.quiz_questions(quiz_id);

-- quiz_attempts
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  obtained_marks integer not null default 0,
  is_passed boolean not null default false,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_quiz_attempts_quiz_id on public.quiz_attempts(quiz_id);
create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts(user_id);

-- quiz_answers
create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option public.quiz_option not null,
  is_correct boolean not null default false
);

create index if not exists idx_quiz_answers_attempt_id on public.quiz_answers(attempt_id);
create index if not exists idx_quiz_answers_question_id on public.quiz_answers(question_id);

-- assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.course_lessons(id) on delete cascade,
  title text not null,
  description text not null default '',
  max_marks integer not null default 100,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists assignments_touch_updated_at on public.assignments;
create trigger assignments_touch_updated_at
before update on public.assignments
for each row execute function public.touch_updated_at();

-- assignment_submissions
create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_url text not null,
  obtained_marks integer,
  feedback text,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_assignment_submissions_assignment_id on public.assignment_submissions(assignment_id);
create index if not exists idx_assignment_submissions_user_id on public.assignment_submissions(user_id);

-- course_reviews
create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  review text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists idx_course_reviews_course_id on public.course_reviews(course_id);
create index if not exists idx_course_reviews_user_id on public.course_reviews(user_id);

-- certificates
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_url text not null,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists idx_certificates_user_id on public.certificates(user_id);
create index if not exists idx_certificates_course_id on public.certificates(course_id);

-- lesson_progress
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  watched_seconds integer not null default 0,
  last_position_seconds integer not null default 0,
  is_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists idx_lesson_progress_user_id on public.lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson_id on public.lesson_progress(lesson_id);

drop trigger if exists lesson_progress_touch_updated_at on public.lesson_progress;
create trigger lesson_progress_touch_updated_at
before update on public.lesson_progress
for each row execute function public.touch_updated_at();

-- RLS
alter table public.courses enable row level security;
alter table public.course_chapters enable row level security;
alter table public.course_lessons enable row level security;
alter table public.purchases enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.course_reviews enable row level security;
alter table public.certificates enable row level security;
alter table public.lesson_progress enable row level security;

-- courses policies
drop policy if exists "Anyone can read published courses" on public.courses;
create policy "Anyone can read published courses"
on public.courses for select
using (status = 'published' or public.is_staff());

drop policy if exists "Staff can insert courses" on public.courses;
create policy "Staff can insert courses"
on public.courses for insert
with check (public.is_staff());

drop policy if exists "Staff can update courses" on public.courses;
create policy "Staff can update courses"
on public.courses for update
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can delete courses" on public.courses;
create policy "Staff can delete courses"
on public.courses for delete
using (public.is_staff());

-- course_chapters policies
drop policy if exists "Anyone can read chapters of published courses" on public.course_chapters;
create policy "Anyone can read chapters of published courses"
on public.course_chapters for select
using (
  exists (
    select 1 from public.courses c
    where c.id = course_chapters.course_id
    and (c.status = 'published' or public.is_staff())
  )
);

drop policy if exists "Staff manage chapters" on public.course_chapters;
create policy "Staff manage chapters"
on public.course_chapters for all
using (public.is_staff())
with check (public.is_staff());

-- course_lessons policies
drop policy if exists "Anyone can read published lessons" on public.course_lessons;
create policy "Anyone can read published lessons"
on public.course_lessons for select
using (
  status = 'published'
  or public.is_staff()
  or exists (
    select 1 from public.course_chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = course_lessons.chapter_id and c.status = 'published'
  )
);

drop policy if exists "Staff manage lessons" on public.course_lessons;
create policy "Staff manage lessons"
on public.course_lessons for all
using (public.is_staff())
with check (public.is_staff());

-- purchases policies
drop policy if exists "Users read own purchases" on public.purchases;
create policy "Users read own purchases"
on public.purchases for select
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users insert own purchases" on public.purchases;
create policy "Users insert own purchases"
on public.purchases for insert
with check (user_id = auth.uid());

drop policy if exists "Staff update purchases" on public.purchases;
create policy "Staff update purchases"
on public.purchases for update
using (public.is_staff())
with check (public.is_staff());

-- course_enrollments policies
drop policy if exists "Users read own enrollments" on public.course_enrollments;
create policy "Users read own enrollments"
on public.course_enrollments for select
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Staff manage enrollments" on public.course_enrollments;
create policy "Staff manage enrollments"
on public.course_enrollments for all
using (public.is_staff())
with check (public.is_staff());

-- quizzes policies
drop policy if exists "Read quizzes for accessible lessons" on public.quizzes;
create policy "Read quizzes for accessible lessons"
on public.quizzes for select
using (
  public.is_staff()
  or exists (
    select 1 from public.course_lessons l
    join public.course_chapters ch on ch.id = l.chapter_id
    join public.courses c on c.id = ch.course_id
    where l.id = quizzes.lesson_id and l.status = 'published' and c.status = 'published'
  )
);

drop policy if exists "Staff manage quizzes" on public.quizzes;
create policy "Staff manage quizzes"
on public.quizzes for all
using (public.is_staff())
with check (public.is_staff());

-- quiz_questions policies
drop policy if exists "Read quiz questions for accessible quizzes" on public.quiz_questions;
create policy "Read quiz questions for accessible quizzes"
on public.quiz_questions for select
using (
  public.is_staff()
  or exists (
    select 1 from public.quizzes q
    join public.course_lessons l on l.id = q.lesson_id
    join public.course_chapters ch on ch.id = l.chapter_id
    join public.courses c on c.id = ch.course_id
    where q.id = quiz_questions.quiz_id and l.status = 'published' and c.status = 'published'
  )
);

drop policy if exists "Staff manage quiz questions" on public.quiz_questions;
create policy "Staff manage quiz questions"
on public.quiz_questions for all
using (public.is_staff())
with check (public.is_staff());

-- quiz_attempts policies
drop policy if exists "Users read own quiz attempts" on public.quiz_attempts;
create policy "Users read own quiz attempts"
on public.quiz_attempts for select
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users insert own quiz attempts" on public.quiz_attempts;
create policy "Users insert own quiz attempts"
on public.quiz_attempts for insert
with check (user_id = auth.uid());

drop policy if exists "Staff manage quiz attempts" on public.quiz_attempts;
create policy "Staff manage quiz attempts"
on public.quiz_attempts for all
using (public.is_staff())
with check (public.is_staff());

-- quiz_answers policies
drop policy if exists "Users read own quiz answers" on public.quiz_answers;
create policy "Users read own quiz answers"
on public.quiz_answers for select
using (
  public.is_staff()
  or exists (
    select 1 from public.quiz_attempts a
    where a.id = quiz_answers.attempt_id and a.user_id = auth.uid()
  )
);

drop policy if exists "Users insert own quiz answers" on public.quiz_answers;
create policy "Users insert own quiz answers"
on public.quiz_answers for insert
with check (
  exists (
    select 1 from public.quiz_attempts a
    where a.id = quiz_answers.attempt_id and a.user_id = auth.uid()
  )
);

drop policy if exists "Staff manage quiz answers" on public.quiz_answers;
create policy "Staff manage quiz answers"
on public.quiz_answers for all
using (public.is_staff())
with check (public.is_staff());

-- assignments policies
drop policy if exists "Read assignments for accessible lessons" on public.assignments;
create policy "Read assignments for accessible lessons"
on public.assignments for select
using (
  public.is_staff()
  or exists (
    select 1 from public.course_lessons l
    join public.course_chapters ch on ch.id = l.chapter_id
    join public.courses c on c.id = ch.course_id
    where l.id = assignments.lesson_id and l.status = 'published' and c.status = 'published'
  )
);

drop policy if exists "Staff manage assignments" on public.assignments;
create policy "Staff manage assignments"
on public.assignments for all
using (public.is_staff())
with check (public.is_staff());

-- assignment_submissions policies
drop policy if exists "Users read own submissions" on public.assignment_submissions;
create policy "Users read own submissions"
on public.assignment_submissions for select
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users insert own submissions" on public.assignment_submissions;
create policy "Users insert own submissions"
on public.assignment_submissions for insert
with check (user_id = auth.uid());

drop policy if exists "Staff grade submissions" on public.assignment_submissions;
create policy "Staff grade submissions"
on public.assignment_submissions for update
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff delete submissions" on public.assignment_submissions;
create policy "Staff delete submissions"
on public.assignment_submissions for delete
using (public.is_staff());

-- course_reviews policies
drop policy if exists "Anyone can read reviews" on public.course_reviews;
create policy "Anyone can read reviews"
on public.course_reviews for select
using (true);

drop policy if exists "Users insert own reviews" on public.course_reviews;
create policy "Users insert own reviews"
on public.course_reviews for insert
with check (user_id = auth.uid());

drop policy if exists "Users update own reviews" on public.course_reviews;
create policy "Users update own reviews"
on public.course_reviews for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Staff manage reviews" on public.course_reviews;
create policy "Staff manage reviews"
on public.course_reviews for all
using (public.is_staff())
with check (public.is_staff());

-- certificates policies
drop policy if exists "Users read own certificates" on public.certificates;
create policy "Users read own certificates"
on public.certificates for select
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Staff manage certificates" on public.certificates;
create policy "Staff manage certificates"
on public.certificates for all
using (public.is_staff())
with check (public.is_staff());

-- lesson_progress policies
drop policy if exists "Users read own progress" on public.lesson_progress;
create policy "Users read own progress"
on public.lesson_progress for select
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users manage own progress" on public.lesson_progress;
create policy "Users manage own progress"
on public.lesson_progress for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Staff read all progress" on public.lesson_progress;
create policy "Staff read all progress"
on public.lesson_progress for select
using (public.is_staff());
