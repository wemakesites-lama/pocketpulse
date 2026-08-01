-- PocketPulse slip storage — a PRIVATE bucket for the receipt photos a user scans.
-- One folder per user (named after their uid); RLS ensures a user can only read/write
-- their own slips. The app never exposes public URLs — it mints short-lived signed URLs
-- on demand. The bucket-relative path is stored per ledger row (`image_path`) inside the
-- batch `payload`, so a slip is always retrievable from the row it was read from.

-- Create the bucket: private, 10 MB cap, image mime types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'slips',
  'slips',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- RLS on storage.objects is enabled by default. Scope every operation to the caller's
-- own top-level folder: the first path segment must equal their uid.

drop policy if exists "slips read own" on storage.objects;
create policy "slips read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "slips insert own" on storage.objects;
create policy "slips insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "slips update own" on storage.objects;
create policy "slips update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "slips delete own" on storage.objects;
create policy "slips delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text);
