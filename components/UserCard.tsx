"use client";

import { ChevronRight, Gift, Heart } from "lucide-react";
import type { User, WishlistItem } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface UserCardProps {
  user: User;
  isFavorite: boolean;
  items: WishlistItem[];
  onOpen: (user: User) => void;
  onFavorite: (user: User) => void;
}

const PREVIEW_COUNT = 3;

export default function UserCard({
  user,
  isFavorite,
  items,
  onOpen,
  onFavorite,
}: UserCardProps) {
  const preview = items.slice(0, PREVIEW_COUNT);
  const hasMore = items.length > PREVIEW_COUNT;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3.5 transition hover:border-emerald-300 hover:shadow-md">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onOpen(user)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
        >
          <Avatar user={user} size="md" />
          <span className="truncate font-semibold text-stone-800">
            {user.name}
          </span>
        </button>
        <span
          role="button"
          tabIndex={0}
          aria-label={isFavorite ? `Remove ${user.name} from favorites` : `Favorite ${user.name}`}
          aria-pressed={isFavorite}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(user);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(user);
            }
          }}
          className={`flex rounded-full p-2 transition ${
            isFavorite
              ? "bg-red-100 text-red-600"
              : "bg-stone-100 text-stone-400 hover:bg-red-50 hover:text-red-500"
          }`}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
        </span>
      </div>

      <div className="mt-3 border-t border-stone-100 pt-3">
        {items.length === 0 ? (
          <p className="text-sm italic text-stone-400">No items yet</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {preview.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm text-stone-600">
                  <Gift className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">{item.item_name}</span>
                </li>
              ))}
            </ul>
            {hasMore ? (
              <button
                type="button"
                onClick={() => onOpen(user)}
                className="mt-2.5 inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
              >
                See more
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
