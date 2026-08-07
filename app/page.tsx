"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Snowflake } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? "/dashboard" : "/login");
    }
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-stone-400">
      <Snowflake className="h-10 w-10 animate-spin-slow text-emerald-700" />
      <p className="text-sm font-medium">Loading Christmas WishList…</p>
    </div>
  );
}
