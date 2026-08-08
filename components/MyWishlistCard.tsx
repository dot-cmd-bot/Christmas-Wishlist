"use client";

import { useState } from "react";
import {
  ExternalLink,
  Gift,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import type { ItemInput, WishlistItem } from "@/lib/types";
import ItemModal from "@/components/ItemModal";

interface MyWishlistCardProps {
  items: WishlistItem[];
  ownerId: string;
  onAdd: (input: ItemInput) => Promise<void>;
  onUpdate: (id: string, patch: Partial<ItemInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleAllowMultiple: (item: WishlistItem) => Promise<void>;
}

export default function MyWishlistCard({
  items,
  ownerId,
  onAdd,
  onUpdate,
  onDelete,
  onToggleAllowMultiple,
}: MyWishlistCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: WishlistItem) {
    setEditing(item);
    setModalOpen(true);
  }

  async function runBusy(id: string | null, fn: () => Promise<void>) {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <Gift className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-bold text-stone-800">My Wishlist</h2>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border-2 border-dashed border-stone-200 p-8 text-center">
          <Gift className="mx-auto h-10 w-10 text-stone-300" />
          <p className="mt-2 text-sm font-medium text-stone-500">
            Your wishlist is empty. Add your first wish!
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-stone-200 p-3.5 transition hover:border-emerald-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                {item.image_url ? (
                  <a
                    href={item.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  </a>
                ) : null}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-stone-800">
                      {item.item_name}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                      Size: {item.item_size}
                    </span>
                    {item.allow_multiple && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        <Users className="h-3 w-3" />
                        Multiple
                      </span>
                    )}
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
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-stone-600">
                  <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-stone-200 transition">
                    <input
                      type="checkbox"
                      checked={item.allow_multiple}
                      onChange={() => runBusy(item.id, () => onToggleAllowMultiple(item))}
                      disabled={busyId === item.id}
                      className="peer sr-only"
                    />
                    <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4 peer-checked:bg-emerald-600" />
                  </span>
                  Multiple
                </label>

                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  aria-label={`Edit ${item.item_name}`}
                  className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => runBusy(item.id, () => onDelete(item.id))}
                  disabled={busyId === item.id}
                  aria-label={`Delete ${item.item_name}`}
                  className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ItemModal
        open={modalOpen}
        item={editing}
        ownerId={ownerId}
        onClose={() => setModalOpen(false)}
        onSubmit={async (input) => {
          if (editing) {
            await runBusy(editing.id, () => onUpdate(editing.id, input));
          } else {
            await runBusy(null, () => onAdd(input));
          }
        }}
      />
    </section>
  );
}
