-- ============================================================
-- Christmas WishList - Update your login photo (run once in SQL Editor)
-- Adds face_image_url to users + a public "faces" bucket where
-- members overwrite their own <face_recognition_id>.jpg.
-- ============================================================

alter table public.users add column if not exists face_image_url text;

insert into storage.buckets (id, name, public)
values ('faces', 'faces', true)
on conflict (id) do nothing;

create policy "faces-public-read" on storage.objects
  for select using (bucket_id = 'faces');
create policy "faces-public-insert" on storage.objects
  for insert with check (bucket_id = 'faces');
create policy "faces-public-update" on storage.objects
  for update using (bucket_id = 'faces');
create policy "faces-public-delete" on storage.objects
  for delete using (bucket_id = 'faces');
