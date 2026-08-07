# 🎄 Christmas WishList

A private, Christmas-themed wishlist app for family and friends. Log in with **face recognition** (runs entirely in the browser — free, no paid APIs), share wishlists, and prevent duplicate gifts with a **hidden reservation system**.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Supabase**, and **`@vladmandic/face-api`** (TensorFlow.js).

---

## ✨ Features

- **Face recognition login** — look at your webcam, click *Recognize me*, and you're in.
- **Dashboard**
  - *Lucky One Card* — shown when `see_lucky_one` is enabled; highlights the user marked as `lucky_one`. If **you** are the lucky one, you instead see a *"You Are the Lucky One!"* banner.
  - *My Wishlist* — add / edit / delete items, and toggle **Allow Multiple Gifts**.
  - *User Directory* — real-time search by name, one favorite per user (auto-replaces the previous favorite, no self-favorites), tap a member to open their wishlist.
- **Hidden reservation system**
  - Reserve items so nobody buys the same gift twice.
  - The **wishlist owner never sees any reservation state**.
  - Other users see only "Reserved" — **never who** reserved it.
  - *Allow Multiple* items accept several reservations; single-gift items accept exactly one (enforced by a database trigger too).

---

## 📦 Project structure

```
app/                  Next.js App Router pages (login, dashboard, wishlist/[userId])
components/           UI components (face auth, cards, directory, modals…)
lib/                  Supabase client, data access, face recognition, session
public/models/        face-api model weights (committed, no network needed)
public/faces/         reference photos: <face_recognition_id>.jpg (+ SVG placeholders)
supabase/schema.sql   tables, triggers + seed data
scripts/copy-models.mjs  re-copy models if you upgrade face-api
```

---

## 🚀 Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. This creates the `users`, `wishlist_items`, and `reservations` tables, the single-gift trigger, and 4 sample members.
3. Copy the project URL and anon key from **Settings → API**.

### 2. Env vars

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> On Vercel, add these two variables under **Project → Settings → Environment Variables** instead.

### 3. Add reference face photos (required for login)

Drop each member's photo into `public/faces/` named after their `face_recognition_id`:

```
public/faces/aaron.jpg
public/faces/archie.jpg
public/faces/mandy.jpg
public/faces/edder.jpg
public/faces/mikan.jpg
public/faces/mama_arcy.jpg
public/faces/papa_jun.jpg
public/faces/joy.jpg
public/faces/lin.jpg
public/faces/michael.jpg
public/faces/gianna.jpg
```

- Use a **front-facing, well-lit** photo.
- The SVG placeholders (`.svg`) are just avatars for the UI — they are **not** usable for recognition, so login won't match until you add the `.jpg` files.
- To add new members: insert a row in `users` (give them a unique `face_recognition_id`) and add their photo.

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Webcam access requires `localhost` or HTTPS (both fine here).

---

## ☁️ Deploy to Vercel

1. Push this repo to **GitHub** (see below).
2. On [vercel.com](https://vercel.com), **Import** the repo.
3. Add the two Supabase environment variables.
4. Deploy. Models and face photos ship as static assets — nothing else is needed.

### Pushing to GitHub

```bash
git init
git add .
git commit -m "Christmas WishList app"
git branch -M main
git remote add origin https://github.com/<you>/christmas-wishlist.git
git push -u origin main
```

---

## 🧪 Trying it out

The seed includes Aaron, Archie, Mandy, Edder, Mikan, Mama Arcy, Papa Jun, Joy, Lin, Michael, and Gianna — all wishlists start empty.

- Aaron and Archie have reference photos (`aaron.jpg`, `archie.jpg`) and can log in by face.
- The other members are in the roster but need a reference photo dropped in `public/faces/<face_recognition_id>.jpg` before face login will match them.

---

## ⚠️ Notes & limitations

- **Demo-grade auth**: face matching runs on the client and a printed photo can spoof a match. This is fine for a family/personal app, not a hardened auth system.
- **Reservation privacy** is enforced in the app layer: the owner never fetches or renders reservation data, and other users only ever see "Reserved", never a name.
- Requires a modern browser (Chrome/Edge/Firefox/Safari) and a camera.
