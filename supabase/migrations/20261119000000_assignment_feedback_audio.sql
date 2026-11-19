-- Admin audio feedback on assignment submissions.
-- Storage path convention for feedback audio:
--   {user_id}/{assignment_id}/feedback/{timestamp}_{filename}

alter table public.assignment_submissions
  add column if not exists feedback_audio_url text;

comment on column public.assignment_submissions.feedback_audio_url is
  'Storage path (assignment-submissions bucket) for admin voice feedback';

update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct mime)
  from unnest(
    coalesce(allowed_mime_types, array[]::text[])
    || array[
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/aac',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/3gpp',
      'audio/webm',
      'audio/ogg'
    ]
  ) as mime
)
where id = 'assignment-submissions';
