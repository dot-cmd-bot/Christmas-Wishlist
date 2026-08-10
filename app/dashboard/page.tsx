"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Image as ImageIcon, Loader2, WifiOff } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import AppHeader from "@/components/AppHeader";
import Avatar from "@/components/Avatar";
import FacePhotoModal from "@/components/FacePhotoModal";
import { LuckyOneBanner, LuckyOneCard } from "@/components/LuckyOneCard";
import MyWishlistCard from "@/components/MyWishlistCard";
import UserDirectory from "@/components/UserDirectory";
import {
  addItem,
  deleteItem,
  fetchAllWishlistItems,
  fetchUsers,
  fetchWishlist,
  setFavorite,
  toggleAllowMultiple,
  updateItem,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { ItemInput, User, WishlistItem } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [allItems, setAllItems] = useState<WishlistItem[]>([]);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [error, setError] = useState(
    isSupabaseConfigured
      ? ""
      : "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    let cancelled = false;
    void (async () => {
      try {
        const [allUsers, myItems, everyItem] = await Promise.all([
          fetchUsers(),
          fetchWishlist(user.id),
          fetchAllWishlistItems(),
        ]);
        if (cancelled) return;
        setUsers(allUsers);
        setItems(myItems);
        setAllItems(everyItem);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Could not load your wishlist data.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleFavorite = useCallback(
    async (target: User) => {
      const next =
        user?.favorite_user_id === target.id ? null : target.id;
      await setFavorite(user!.id, next);
      await refresh();
    },
    [user, refresh],
  );

  const itemsByUser = useMemo(() => {
    const map = new Map<string, WishlistItem[]>();
    for (const item of allItems) {
      const list = map.get(item.owner_id) ?? [];
      list.push(item);
      map.set(item.owner_id, list);
    }
    return map;
  }, [allItems]);

  if (loading || !user || !ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-stone-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-sm font-medium">Loading your dashboard…</p>
      </div>
    );
  }

  const otherUsers = users.filter((u) => u.id !== user.id);
  const luckyOne = users.find((u) => u.lucky_one) ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6ec] to-emerald-50/40">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {user.lucky_one ? <LuckyOneBanner /> : null}

        {!user.lucky_one && user.see_lucky_one && luckyOne ? (
          <LuckyOneCard user={luckyOne} />
        ) : null}

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar user={user} size="lg" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-stone-800">
                  Welcome, {user.name}!
                </h1>
                <p className="text-sm text-stone-500">
                  Manage how you appear and how you log in.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => setFaceModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
              >
                <Camera className="h-4 w-4" />
                Change face login photo
              </button>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
              >
                <ImageIcon className="h-4 w-4" />
                Change profile picture
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
            <p className="flex gap-2">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                <strong>Change face login photo:</strong> take a front-facing
                selfie. This is the photo used to recognize you when you log
                in — it is not shown to anyone.
              </span>
            </p>
            <p className="flex gap-2">
              <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                <strong>Change profile picture:</strong> choose the photo that
                everyone sees next to your name in the members directory. It
                has no effect on logging in.
              </span>
            </p>
          </div>
        </section>

        <MyWishlistCard
          items={items}
          ownerId={user.id}
          onAdd={async (input: ItemInput) => {
            const item = await addItem(user.id, input);
            setItems((prev) => [...prev, item]);
          }}
          onUpdate={async (id, patch) => {
            const item = await updateItem(id, patch);
            setItems((prev) =>
              prev.map((x) => (x.id === id ? item : x)),
            );
          }}
          onDelete={async (id) => {
            await deleteItem(id);
            setItems((prev) => prev.filter((x) => x.id !== id));
          }}
          onToggleAllowMultiple={async (item) => {
            await toggleAllowMultiple(item.id, item.allow_multiple);
            setItems((prev) =>
              prev.map((x) =>
                x.id === item.id
                  ? { ...x, allow_multiple: !x.allow_multiple }
                  : x,
              ),
            );
          }}
        />

        <UserDirectory
          users={otherUsers}
          currentUser={user}
          itemsByUser={itemsByUser}
          onFavorite={handleFavorite}
        />

        <FacePhotoModal
          open={faceModalOpen}
          user={user}
          mode="login"
          onClose={() => setFaceModalOpen(false)}
          onSaved={refresh}
        />
        <FacePhotoModal
          open={profileModalOpen}
          user={user}
          mode="profile"
          onClose={() => setProfileModalOpen(false)}
          onSaved={refresh}
        />
      </main>
    </div>
  );
}
