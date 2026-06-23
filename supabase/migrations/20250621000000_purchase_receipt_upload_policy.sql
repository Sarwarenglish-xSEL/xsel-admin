drop policy if exists "Users update own receipts" on storage.objects;
create policy "Users update own receipts"
on storage.objects for update
using (
  bucket_id = 'purchase-receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'purchase-receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);
