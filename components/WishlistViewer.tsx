"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Gift,
  Lock,
  PackageCheck,
} from "lucide-react";
import type { Reservation, WishlistItem } from "@/lib/types";

interface WishlistViewerProps {
  items: WishlistItem[];
  reservations: Reservation[];
  viewerId: string;
  onReserve: (itemId: string) => Promise<void>;
  onUnreserve: (itemId: string) => Promise<void>;
}

export default function WishlistViewer({
  items,
  reservations,
  viewerId,
  onReserve,
  onUnreserve,
}: WishlistViewerProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(itemId: string, fn: () => Promise<void>) {
    setBusyId(itemId);
    setError("");
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setError(
        "Could not update the reservation. The item may have just been reserved by someone else.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-10 text-center">
        <Gift className="mx-auto h-10 w-10 text-stone-300" />
        <p className="mt-2 text-sm font-medium text-stone-500">
          This wishlist is empty — nothing here yet!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const mine = reservations.find(
            (r) =>
              r.wishlist_item_id === item.id &&
              r.reserved_by_user_id === viewerId,
          );
          const totalReserved = reservations.filter(
            (r) => r.wishlist_item_id === item.id,
          ).length;
          const othersReserved = totalReserved - (mine ? 1 : 0);
          const canReserve =
            !mine && (item.allow_multiple || totalReserved === 0);

          return (
            <li
              key={item.id}
              className="rounded-xl border border-stone-200 bg-white p-4 transition hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-stone-800">
                      {item.item_name}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                      Size: {item.item_size}
                    </span>
                  </div>
                  {item.purchase_link && (
                    <a
                      href={item.purchase_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {item.purchase_link}
                    </a>
                  )}
                  {item.allow_multiple && othersReserved > 0 && !mine && (
                    <p className="mt-1 text-xs text-stone-400">
                      Already reserved by {othersReserved} other
                      {othersReserved > 1 ? "s" : ""} (names hidden)
                    </p>
                  )}
                </div>
                {item.image_url && (
                  <a
                    href={item.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  </a>
                )}
              </div>

                <div className="shrink-0">
                  {mine ? (
                    <button
                      type="button"
                      onClick={() =>
                        run(item.id, () => onUnreserve(item.id))
                      }
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Reserved by You — Unreserve
                    </button>
                  ) : canReserve ? (
                    <button
                      type="button"
                      onClick={() => run(item.id, () => onReserve(item.id))}
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <PackageCheck className="h-4 w-4" />
                      Reserve
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-500">
                      <Lock className="h-4 w-4" />
                      Reserved
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
