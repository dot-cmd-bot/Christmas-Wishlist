-- ============================================================
-- Christmas WishList - Security lockdown
-- Run this in the Supabase SQL Editor AFTER schema.sql.
--
-- Model: the browser NEVER talks to Supabase directly. All reads/writes
-- go through Next.js server actions / route handlers using the
-- service_role key (which bypasses RLS). Therefore:
--   * anon / authenticated get NO table access and NO write access to storage
--   * storage stays public-READ so <img> tags and face matching can load photos
--   * RLS is enabled as defense-in-depth with no public policies (default deny)
-- ============================================================

-- ------------------------------------------------------------
-- face_descriptors: cached recognition descriptors so login doesn't
-- recompute every member's descriptor on a cold server.
-- ------------------------------------------------------------
create table if not exists public.face_descriptors (
  user_id uuid primary key references public.users (id) on delete cascade,
  descriptor float8[] not null,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS: enable on every table, no public policies (default deny).
-- ------------------------------------------------------------
alter table public.users enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.reservations enable row level security;
alter table public.face_descriptors enable row level security;

-- ------------------------------------------------------------
-- Kill anonymous / authenticated table access entirely.
-- Only service_role (used server-side) can read or write.
-- ------------------------------------------------------------
revoke all on table public.users from anon, authenticated;
revoke all on table public.wishlist_items from anon, authenticated;
revoke all on table public.reservations from anon, authenticated;
revoke all on table public.face_descriptors from anon, authenticated;

-- ------------------------------------------------------------
-- Storage: images must remain readable by anyone (public buckets),
-- but WRITE access is restricted to the service role only.
-- ------------------------------------------------------------
-- item-images: keep public read, remove anon write policies.
drop policy if exists "item-images-public-read" on storage.objects;
drop policy if exists "item-images-public-insert" on storage.objects;
drop policy if exists "item-images-public-delete" on storage.objects;
create policy "item-images-public-read" on storage.objects
  for select using (bucket_id = 'item-images');

-- faces: keep public read (needed for face matching + avatars),
-- remove anon write policies.
drop policy if exists "faces-public-read" on storage.objects;
drop policy if exists "faces-public-insert" on storage.objects;
drop policy if exists "faces-public-update" on storage.objects;
drop policy if exists "faces-public-delete" on storage.objects;
create policy "faces-public-read" on storage.objects
  for select using (bucket_id = 'faces');

revoke all on table storage.objects from anon, authenticated;
grant select on table storage.objects to anon;
