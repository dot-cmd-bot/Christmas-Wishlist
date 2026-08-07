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
-- SEED DATA (sample family)
-- Add your own members and drop their reference photos in
-- /public/faces/<face_recognition_id>.jpg
-- ============================================================

insert into public.users
  (id, name, profile_picture, face_recognition_id, see_lucky_one, lucky_one, favorite_user_id)
values
  ('11111111-1111-4111-8111-111111111111', 'Alice', '/faces/alice.svg', 'alice', true, false, '22222222-2222-4222-8222-222222222222'),
  ('22222222-2222-4222-8222-222222222222', 'Bob',   '/faces/bob.svg',   'bob',   false, true, null),
  ('33333333-3333-4333-8333-333333333333', 'Carol', '/faces/carol.svg', 'carol', false, false, '44444444-4444-4444-8444-444444444444'),
  ('44444444-4444-4444-8444-444444444444', 'Dave',  '/faces/dave.svg',  'dave',  false, false, null),
  ('55555555-5555-4555-8555-555555555555', 'Aaron', '/faces/aaron.jpg', 'aaron', true, false, '22222222-2222-4222-8222-222222222222')
on conflict (id) do nothing;

insert into public.wishlist_items
  (id, owner_id, item_name, item_size, purchase_link, allow_multiple)
values
  -- Alice
  ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Nintendo Switch',   'Standard',  null, false),
  ('a1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Coffee Grinder',    'Medium',    null, false),
  ('a1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Gift Card $50',     'Any',       'https://example.com', true),
  -- Bob (the Lucky One)
  ('b2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Nintendo Switch',   'OLED',      null, false),
  ('b2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Chocolate Box',     'Large',     null, true),
  ('b2000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'LEGO Set',          '18+',       null, false),
  -- Carol
  ('c3000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Kindle',            '11 Gen',    null, false),
  ('c3000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'Cozy Socks Pack',   'One size',  null, true),
  ('c3000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 'Board Game',        'Standard',  null, false),
  -- Dave
  ('d4000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'Instant Camera',    'Mini',      null, false),
  ('d4000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'Slippers',          '42',        null, true),
  ('d4000000-0000-4000-8000-000000000003', '44444444-4444-4444-8444-444444444444', 'Cookbook',          'Hardcover', null, false),
  -- Aaron
  ('e5000000-0000-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555', 'Wireless Headphones', 'Over-ear', null, false),
  ('e5000000-0000-4000-8000-000000000002', '55555555-5555-4555-8555-555555555555', 'Sneakers',            'US 10',    null, false),
  ('e5000000-0000-4000-8000-000000000003', '55555555-5555-4555-8555-555555555555', 'Coffee Gift Card',    'Any',      'https://example.com', true)
on conflict (id) do nothing;

insert into public.reservations
  (wishlist_item_id, reserved_by_user_id)
values
  ('b2000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111'), -- Alice reserved Bob's Switch (single)
  ('b2000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111'), -- Alice reserved Bob's Chocolate Box (multi)
  ('b2000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444'), -- Dave also reserved the Chocolate Box (multi)
  ('a1000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222'), -- Bob reserved Alice's Switch (single)
  ('c3000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111')  -- Alice reserved Carol's Board Game (single)
on conflict (wishlist_item_id, reserved_by_user_id) do nothing;
