"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { ItemInput, WishlistItem } from "@/lib/types";

interface ItemModalProps {
  open: boolean;
  item: WishlistItem | null;
  onClose: () => void;
  onSubmit: (input: ItemInput) => Promise<void>;
}

export default function ItemModal({
  open,
  item,
  onClose,
  onSubmit,
}: ItemModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ItemForm
          key={item?.id ?? "new"}
          item={item}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

function ItemForm({
  item,
  onClose,
  onSubmit,
}: {
  item: WishlistItem | null;
  onClose: () => void;
  onSubmit: (input: ItemInput) => Promise<void>;
}) {
  const [name, setName] = useState(item?.item_name ?? "");
  const [size, setSize] = useState(item?.item_size ?? "");
  const [link, setLink] = useState(item?.purchase_link ?? "");
  const [allowMultiple, setAllowMultiple] = useState(
    item?.allow_multiple ?? false,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !size.trim()) {
      setError("Item name and size are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        item_name: name.trim(),
        item_size: size.trim(),
        purchase_link: link.trim() || null,
        allow_multiple: allowMultiple,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not save the item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-stone-800">
          {item ? "Edit Item" : "Add Item"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
          Item Name *
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nintendo Switch"
            className="rounded-xl border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
          Item Size *
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g. Standard / M / 42"
            className="rounded-xl border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
          Purchase Link (optional)
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            className="rounded-xl border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-stone-700">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 accent-emerald-700"
          />
          Allow multiple gifts (anyone can reserve this item)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? "Saving…" : item ? "Save changes" : "Add item"}
          </button>
        </div>
      </form>
    </>
  );
}
