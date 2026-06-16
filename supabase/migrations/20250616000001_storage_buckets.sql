-- Storage buckets for XSEL course platform

insert into storage.buckets (id, name, public)
values
  ('course-thumbnails', 'course-thumbnails', true),
  ('purchase-receipts', 'purchase-receipts', false),
  ('assignment-submissions', 'assignment-submissions', false),
  ('certificates', 'certificates', false)
on conflict (id) do nothing;

-- course-thumbnails: public read, staff write
drop policy if exists "Public read course thumbnails" on storage.objects;
create policy "Public read course thumbnails"
on storage.objects for select
using (bucket_id = 'course-thumbnails');

drop policy if exists "Staff upload course thumbnails" on storage.objects;
create policy "Staff upload course thumbnails"
on storage.objects for insert
with check (bucket_id = 'course-thumbnails' and public.is_staff());

drop policy if exists "Staff update course thumbnails" on storage.objects;
create policy "Staff update course thumbnails"
on storage.objects for update
using (bucket_id = 'course-thumbnails' and public.is_staff())
with check (bucket_id = 'course-thumbnails' and public.is_staff());

drop policy if exists "Staff delete course thumbnails" on storage.objects;
create policy "Staff delete course thumbnails"
on storage.objects for delete
using (bucket_id = 'course-thumbnails' and public.is_staff());

-- purchase-receipts: user upload own, staff read all
drop policy if exists "Users upload own receipts" on storage.objects;
create policy "Users upload own receipts"
on storage.objects for insert
with check (
  bucket_id = 'purchase-receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users read own receipts" on storage.objects;
create policy "Users read own receipts"
on storage.objects for select
using (
  bucket_id = 'purchase-receipts'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_staff()
  )
);

drop policy if exists "Staff manage receipts" on storage.objects;
create policy "Staff manage receipts"
on storage.objects for all
using (bucket_id = 'purchase-receipts' and public.is_staff())
with check (bucket_id = 'purchase-receipts' and public.is_staff());

-- assignment-submissions: user upload own, staff read
drop policy if exists "Users upload own submissions" on storage.objects;
create policy "Users upload own submissions"
on storage.objects for insert
with check (
  bucket_id = 'assignment-submissions'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users read own submission files" on storage.objects;
create policy "Users read own submission files"
on storage.objects for select
using (
  bucket_id = 'assignment-submissions'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_staff()
  )
);

drop policy if exists "Staff manage submission files" on storage.objects;
create policy "Staff manage submission files"
on storage.objects for all
using (bucket_id = 'assignment-submissions' and public.is_staff())
with check (bucket_id = 'assignment-submissions' and public.is_staff());

-- certificates: staff write, user read own
drop policy if exists "Staff upload certificates" on storage.objects;
create policy "Staff upload certificates"
on storage.objects for insert
with check (bucket_id = 'certificates' and public.is_staff());

drop policy if exists "Read certificates" on storage.objects;
create policy "Read certificates"
on storage.objects for select
using (
  bucket_id = 'certificates'
  and (
    public.is_staff()
    or auth.uid()::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Staff update certificates" on storage.objects;
create policy "Staff update certificates"
on storage.objects for update
using (bucket_id = 'certificates' and public.is_staff())
with check (bucket_id = 'certificates' and public.is_staff());

drop policy if exists "Staff delete certificates" on storage.objects;
create policy "Staff delete certificates"
on storage.objects for delete
using (bucket_id = 'certificates' and public.is_staff());
