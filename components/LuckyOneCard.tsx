"use client";

import { Crown, Gift, Sparkles } from "lucide-react";
import type { User } from "@/lib/types";
import Avatar from "@/components/Avatar";

export function LuckyOneCard({ user }: { user: User }) {
  return (
    <section
      aria-label="Lucky One"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-6 text-white shadow-lg ring-1 ring-emerald-900/40"
    >
      <Sparkles className="absolute right-4 top-4 h-8 w-8 text-amber-300/60" />
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar user={user} size="lg" className="ring-4 ring-amber-400/80" />
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-emerald-900 shadow">
            <Crown className="h-5 w-5" />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">
            🎁 The Lucky One
          </p>
          <h2 className="mt-1 text-2xl font-extrabold">{user.name}</h2>
          <p className="mt-1 text-sm text-emerald-100">
            This year&apos;s lucky one is {user.name}! Make sure they have a
            magical Christmas. 🎄
          </p>
        </div>
      </div>
    </section>
  );
}

export function LuckyOneBanner() {
  return (
    <section
      aria-label="You are the lucky one"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 p-6 text-amber-950 shadow-lg ring-1 ring-amber-600/40"
    >
      <Crown className="absolute right-4 top-4 h-10 w-10 text-amber-900/30" />
      <div className="flex items-center gap-4">
        <Gift className="h-12 w-12 text-amber-900" />
        <div>
          <h2 className="text-2xl font-extrabold">
            You Are the Lucky One! 🎉
          </h2>
          <p className="mt-1 text-sm font-medium text-amber-900/80">
            Enjoy your special Christmas — everyone is thinking of you!
          </p>
        </div>
      </div>
    </section>
  );
}
