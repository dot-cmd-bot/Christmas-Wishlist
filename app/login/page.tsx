"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Snowflake } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import FaceAuth from "@/components/FaceAuth";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  async function handleSuccess(matchedUser: User) {
    await login(matchedUser.id, matchedUser.name);
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-900 via-emerald-800 to-red-900">
      <header className="flex items-center justify-center gap-2.5 py-6 text-white">
        <Snowflake className="h-7 w-7 animate-spin-slow text-amber-300" />
        <span className="text-2xl font-extrabold tracking-tight">
          Christmas <span className="text-amber-300">WishList</span>
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-10">
        <div className="w-full rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <h1 className="text-center text-xl font-bold text-stone-800">
            Smile to log in 🎄
          </h1>
          <p className="mt-1 text-center text-sm text-stone-500">
            Look at the camera and press the button.
          </p>
          <div className="mt-6">
            <FaceAuth onSuccess={handleSuccess} />
          </div>
        </div>
      </main>
    </div>
  );
}
