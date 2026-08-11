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
  getDashboardData,
  setFavorite,
  toggleAllowMultiple,
  updateItem,
} from "@/lib/actions";
import type { ItemInput, User, WishlistItem } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [allItems, setAllItems] = useState<WishlistItem[]>([]);
  const [luckyOne, setLuckyOne] = useState<User | null>(null);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const result = await getDashboardData();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
      } else {
        setUsers(result.data.users);
        setItems(result.data.items);
        setAllItems(result.data.allItems);
        setLuckyOne(result.data.luckyOne);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleFavorite = useCallback(
    async (target: User) => {
      const next = user?.favorite_user_id === target.id ? null : target.id;
      try {
        const result = await setFavorite(next);
        if (!result.ok) throw new Error(result.error);
        await refresh();
      } catch (err) {
        console.error(err);
        setError("Could not update your favorite. Please try again.");
      }
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

  const luckyMember = luckyOne;

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

        {!user.lucky_one && user.see_lucky_one && luckyMember ? (
          <LuckyOneCard user={luckyMember} />
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
          onAdd={async (input: ItemInput) => {
            const result = await addItem(input);
            if (!result.ok) throw new Error(result.error);
            setItems((prev) => [...prev, result.data]);
          }}
          onUpdate={async (id, patch) => {
            const result = await updateItem(id, patch);
            if (!result.ok) throw new Error(result.error);
            setItems((prev) => prev.map((x) => (x.id === id ? result.data : x)));
          }}
          onDelete={async (id) => {
            const result = await deleteItem(id);
            if (!result.ok) throw new Error(result.error);
            setItems((prev) => prev.filter((x) => x.id !== id));
          }}
          onToggleAllowMultiple={async (item) => {
            const result = await toggleAllowMultiple(item.id, item.allow_multiple);
            if (!result.ok) throw new Error(result.error);
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
          users={users}
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
