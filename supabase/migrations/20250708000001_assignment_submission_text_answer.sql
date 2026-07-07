-- Allow assignment submissions with a file, written text, or both.

alter table public.assignment_submissions
  alter column file_url drop not null;

alter table public.assignment_submissions
  add column if not exists text_answer text;

alter table public.assignment_submissions
  drop constraint if exists assignment_submissions_content_check;

alter table public.assignment_submissions
  add constraint assignment_submissions_content_check
  check (
    (file_url is not null and btrim(file_url) <> '')
    or (text_answer is not null and btrim(text_answer) <> '')
  );
