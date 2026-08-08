-- ============================================================
-- Christmas WishList - Item photos (run once in SQL Editor)
-- Adds the image_url column + a public "item-images" bucket
-- with anon read/insert/delete policies.
-- ============================================================

alter table public.wishlist_items add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "item-images-public-read" on storage.objects
  for select using (bucket_id = 'item-images');
create policy "item-images-public-insert" on storage.objects
  for insert with check (bucket_id = 'item-images');
create policy "item-images-public-delete" on storage.objects
  for delete using (bucket_id = 'item-images');
