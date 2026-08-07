"use client";

import { Snowflake, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 border-b border-red-900/20 bg-gradient-to-r from-red-800 via-red-700 to-emerald-800 text-white shadow-lg">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Snowflake className="h-6 w-6 animate-spin-slow text-amber-300" />
          <span className="text-lg font-bold tracking-tight">
            Christmas <span className="text-amber-300">WishList</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-sm font-medium text-red-50 sm:inline">
              Hi, {user.name}!
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
