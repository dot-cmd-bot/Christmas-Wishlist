"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import AppHeader from "@/components/AppHeader";
import Avatar from "@/components/Avatar";
import WishlistViewer from "@/components/WishlistViewer";
import {
  fetchUserById,
  fetchWishlistForViewer,
  reserveItem,
  unreserveItem,
} from "@/lib/data";
import type { Reservation, User, WishlistItem } from "@/lib/types";

export default function WishlistPage() {
  const params = useParams<{ userId: string }>();
  const ownerId = params.userId;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [owner, setOwner] = useState<User | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (ownerId === user.id) {
      router.replace("/dashboard");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [ownerData, view] = await Promise.all([
          fetchUserById(ownerId),
          fetchWishlistForViewer(ownerId),
        ]);
        if (cancelled) return;
        if (!ownerData) {
          setError("That user could not be found.");
        } else {
          setOwner(ownerData);
          setItems(view.items);
          setReservations(view.reservations);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Could not load this wishlist.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId, user, loading, router]);

  const handleReserve = useCallback(
    async (itemId: string) => {
      await reserveItem(itemId, user!.id);
      setReservations((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          wishlist_item_id: itemId,
          reserved_by_user_id: user!.id,
        },
      ]);
    },
    [user],
  );

  const handleUnreserve = useCallback(
    async (itemId: string) => {
      await unreserveItem(itemId, user!.id);
      setReservations((prev) =>
        prev.filter(
          (r) =>
            !(r.wishlist_item_id === itemId && r.reserved_by_user_id === user!.id),
        ),
      );
    },
    [user],
  );

  if (loading || !user || !ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-stone-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-sm font-medium">Loading wishlist…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6ec] to-emerald-50/40">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-stone-500 transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-6 text-center text-red-700 ring-1 ring-red-200">
            <p className="font-semibold">{error}</p>
          </div>
        ) : owner ? (
          <>
            <section className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white shadow-lg">
              <Avatar user={owner} size="lg" className="ring-4 ring-white/20" />
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-200">
                  <UserIcon className="h-4 w-4" />
                  {owner.see_lucky_one && owner.lucky_one ? "The Lucky One" : "Member"}
                </p>
                <h1 className="text-2xl font-extrabold">
                  {owner.name}&apos;s Wishlist
                </h1>
                <p className="mt-0.5 text-sm text-emerald-100">
                  View and reserve gifts. Reservations stay hidden from {owner.name}.
                </p>
              </div>
            </section>

            <WishlistViewer
              items={items}
              reservations={reservations}
              viewerId={user.id}
              onReserve={handleReserve}
              onUnreserve={handleUnreserve}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
