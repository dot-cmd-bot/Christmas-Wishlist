"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User, WishlistItem } from "@/lib/types";
import UserCard from "@/components/UserCard";

interface UserDirectoryProps {
  users: User[];
  currentUser: User;
  itemsByUser: Map<string, WishlistItem[]>;
  onFavorite: (user: User) => void;
}

export default function UserDirectory({
  users,
  currentUser,
  itemsByUser,
  onFavorite,
}: UserDirectoryProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Users className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold text-stone-800">
          Everyone&apos;s Wishlists
        </h2>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="w-full rounded-xl border border-stone-300 py-2 pl-9 pr-3 text-stone-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
      </div>

      {users.length === 0 ? (
        <div className="mt-4 rounded-xl border-2 border-dashed border-stone-200 p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-stone-300" />
          <p className="mt-2 text-sm font-medium text-stone-500">
            No other members yet. Invite family and friends!
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-4 rounded-xl border border-stone-200 p-4 text-center text-sm text-stone-500">
          No one matches “{query}”.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((user) => (
            <li key={user.id}>
              <UserCard
                user={user}
                isFavorite={currentUser.favorite_user_id === user.id}
                items={itemsByUser.get(user.id) ?? []}
                onOpen={(u) => router.push(`/wishlist/${u.id}`)}
                onFavorite={onFavorite}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
