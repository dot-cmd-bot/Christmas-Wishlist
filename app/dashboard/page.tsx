"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, WifiOff } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import AppHeader from "@/components/AppHeader";
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

        <h1 className="text-2xl font-bold text-stone-800">
          Welcome, {user.name}!
        </h1>

        <MyWishlistCard
          items={items}
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
      </main>
    </div>
  );
}
