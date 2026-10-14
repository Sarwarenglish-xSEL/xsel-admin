-- Storage bucket for lesson attachment files (table managed separately / already applied)

insert into storage.buckets (id, name, public)
values ('lesson-attachments', 'lesson-attachments', true)
on conflict (id) do nothing;

drop policy if exists "Public read lesson attachments" on storage.objects;
create policy "Public read lesson attachments"
on storage.objects for select
using (bucket_id = 'lesson-attachments');

drop policy if exists "Staff upload lesson attachments" on storage.objects;
create policy "Staff upload lesson attachments"
on storage.objects for insert
with check (bucket_id = 'lesson-attachments' and public.is_staff());

drop policy if exists "Staff update lesson attachments" on storage.objects;
create policy "Staff update lesson attachments"
on storage.objects for update
using (bucket_id = 'lesson-attachments' and public.is_staff())
with check (bucket_id = 'lesson-attachments' and public.is_staff());

drop policy if exists "Staff delete lesson attachments" on storage.objects;
create policy "Staff delete lesson attachments"
on storage.objects for delete
using (bucket_id = 'lesson-attachments' and public.is_staff());
