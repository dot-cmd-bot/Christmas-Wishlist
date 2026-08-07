"use client";

import { Heart } from "lucide-react";
import type { User } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface UserCardProps {
  user: User;
  isFavorite: boolean;
  onOpen: (user: User) => void;
  onFavorite: (user: User) => void;
}

export default function UserCard({
  user,
  isFavorite,
  onOpen,
  onFavorite,
}: UserCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(user)}
      className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-3.5 text-left transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <Avatar user={user} size="md" />
      <span className="min-w-0 flex-1 truncate font-semibold text-stone-800">
        {user.name}
      </span>
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
    </button>
  );
}
