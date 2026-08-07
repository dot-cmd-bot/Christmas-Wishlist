-- ============================================================
-- Christmas WishList - Supabase schema + seed data
-- Run this in the Supabase SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- users
-- face_recognition_id matches a reference photo in /public/faces
-- ------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  profile_picture text,
  face_recognition_id text unique not null,
  see_lucky_one boolean not null default false,
  lucky_one boolean not null default false,
  favorite_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- wishlist_items
-- ------------------------------------------------------------
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  item_name text not null,
  item_size text not null,
  purchase_link text,
  allow_multiple boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wishlist_items_owner_idx on public.wishlist_items (owner_id);

-- ------------------------------------------------------------
-- reservations (kept hidden from the wishlist owner)
-- ------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  wishlist_item_id uuid not null references public.wishlist_items (id) on delete cascade,
  reserved_by_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_item_id, reserved_by_user_id)
);

create index if not exists reservations_item_idx on public.reservations (wishlist_item_id);

-- ------------------------------------------------------------
-- Database-level guard: a single-gift item (allow_multiple = false)
-- may only ever have one reservation.
-- ------------------------------------------------------------
create or replace function public.enforce_single_gift_reservation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.wishlist_items
    where id = new.wishlist_item_id and allow_multiple
  ) then
    if exists (
      select 1 from public.reservations where wishlist_item_id = new.wishlist_item_id
    ) then
      raise exception 'item is already reserved and does not allow multiple reservations';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_single_gift_reservation_trg on public.reservations;
create trigger enforce_single_gift_reservation_trg
before insert on public.reservations
for each row execute function public.enforce_single_gift_reservation();

-- ------------------------------------------------------------
-- Helper: keep only the earliest reservation for an item.
-- Used when the owner flips an item to single-gift.
-- ------------------------------------------------------------
create or replace function public.trim_extra_reservations(p_item_id uuid)
returns void
language plpgsql
as $$
begin
  delete from public.reservations
  where wishlist_item_id = p_item_id
    and id <> (
      select id from public.reservations
      where wishlist_item_id = p_item_id
      order by created_at asc
      limit 1
    );
end;
$$;

-- ============================================================
-- SEED DATA (family roster)
-- Add your own members and drop their reference photos in
-- /public/faces/<face_recognition_id>.jpg
-- Wishlists start empty; each member adds items from their dashboard.
-- ============================================================

insert into public.users
  (id, name, profile_picture, face_recognition_id, see_lucky_one, lucky_one, favorite_user_id)
values
  ('11111111-1111-4111-8111-111111111111', 'Aaron',    '/faces/aaron.jpg',   'aaron',     false, false, null),
  ('aa000000-0000-4000-8000-000000000001', 'Archie',   '/faces/archie.jpg',  'archie',    false, false, null),
  ('bb000000-0000-4000-8000-000000000002', 'Mandy',    null,                 'mandy',     false, false, null),
  ('cc000000-0000-4000-8000-000000000003', 'Edder',    null,                 'edder',     false, false, null),
  ('dd000000-0000-4000-8000-000000000004', 'Mikan',    null,                 'mikan',     false, false, null),
  ('ee000000-0000-4000-8000-000000000005', 'Mama Arcy', null,                'mama_arcy', false, false, null),
  ('ff000000-0000-4000-8000-000000000006', 'Papa Jun', null,                 'papa_jun',  false, false, null),
  ('01000000-0000-4000-8000-000000000007', 'Joy',      null,                 'joy',       false, false, null),
  ('02000000-0000-4000-8000-000000000008', 'Lin',      null,                 'lin',       false, false, null),
  ('03000000-0000-4000-8000-000000000009', 'Michael',  null,                 'michael',   false, false, null),
  ('04000000-0000-4000-8000-000000000000', 'Gianna',   null,                 'gianna',    false, false, null)
on conflict (id) do nothing;
