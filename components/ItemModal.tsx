"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import type { ItemInput, WishlistItem } from "@/lib/types";
import { resizeImage, uploadItemImage } from "@/lib/itemImage";
import ImageCapture from "@/components/ImageCapture";

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

  const [imageUrl, setImageUrl] = useState<string | null>(
    item?.image_url ?? null,
  );
  const [pendingImage, setPendingImage] = useState<{
    blob: Blob;
    url: string;
  } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const preview = pendingImage?.url ?? imageUrl;
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setPending(blob: Blob) {
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
  }

  function clearPending() {
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

  function handleCaptured(blob: Blob) {
    setPending(blob);
    setCameraOpen(false);
    setShowOptions(false);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPending(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowOptions(false);
  }

  function handleRemovePhoto() {
    clearPending();
    setImageUrl(null);
    setShowOptions(false);
    setCameraOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !size.trim()) {
      setError("Item name and size are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    let finalImageUrl = imageUrl;
    try {
      if (pendingImage) {
        const resized = await resizeImage(pendingImage.blob);
        finalImageUrl = await uploadItemImage(resized);
      }
      await onSubmit({
        item_name: name.trim(),
        item_size: size.trim(),
        purchase_link: link.trim() || null,
        image_url: finalImageUrl,
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
            ref={nameInputRef}
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

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">
            Photo (optional)
          </span>

          {preview ? (
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Item preview"
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              {!cameraOpen && (
                <div className="ml-auto flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowOptions((v) => !v)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100"
                  >
                    Replace photo
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove photo
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {cameraOpen ? (
            <>
              <ImageCapture onCapture={handleCaptured} onError={setError} />
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="self-start text-xs font-medium text-stone-500 underline-offset-2 hover:underline"
              >
                Cancel camera
              </button>
            </>
          ) : showOptions || !preview ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCameraOpen(true);
                  setShowOptions(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                <Camera className="h-4 w-4" />
                Take photo
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">
                <ImagePlus className="h-4 w-4" />
                Upload
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>
          ) : null}
        </div>

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
