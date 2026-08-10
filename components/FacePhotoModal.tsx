"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import CameraCapture, {
  type CameraCaptureHandle,
} from "@/components/CameraCapture";
import {
  uploadFaceImage,
  uploadProfilePicture,
} from "@/lib/faceImage";
import { updateFaceImage, updateProfilePicture } from "@/lib/data";
import type { User } from "@/lib/types";

export type FacePhotoMode = "login" | "profile";

interface FacePhotoModalProps {
  open: boolean;
  user: User | null;
  mode: FacePhotoMode;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const MODE_COPY: Record<
  FacePhotoMode,
  { title: string; caption: string }
> = {
  login: {
    title: "Update your login photo",
    caption: "Looks good? This becomes the photo used to recognize you when you log in.",
  },
  profile: {
    title: "Update your profile picture",
    caption: "Looks good? This becomes the photo everyone sees next to your name.",
  },
};

export default function FacePhotoModal({
  open,
  user,
  mode,
  onClose,
  onSaved,
}: FacePhotoModalProps) {
  const cameraRef = useRef<CameraCaptureHandle>(null);
  const capturedRef = useRef<{ blob: Blob; url: string } | null>(null);
  const [captured, setCaptured] = useState<{ blob: Blob; url: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (capturedRef.current) URL.revokeObjectURL(capturedRef.current.url);
    },
    [],
  );

  if (!open || !user) return null;

  function handleCapture() {
    const canvas = cameraRef.current?.capture();
    if (!canvas) {
      setError("Could not read the camera feed. Please try again.");
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Could not encode the photo. Please try again.");
        return;
      }
      const url = URL.createObjectURL(blob);
      if (capturedRef.current) URL.revokeObjectURL(capturedRef.current.url);
      capturedRef.current = { blob, url };
      setCaptured({ blob, url });
      setError("");
    }, "image/jpeg", 0.92);
  }

  function handleRetake() {
    setCaptured(null);
    setError("");
  }

  function handleCancel() {
    setCaptured(null);
    setError("");
    onClose();
  }

  async function handleSave() {
    if (!captured || !user || saving) return;
    setSaving(true);
    setError("");
    try {
      const url =
        mode === "login"
          ? await uploadFaceImage(user.face_recognition_id, captured.blob)
          : await uploadProfilePicture(user.face_recognition_id, captured.blob);
      if (mode === "login") {
        await updateFaceImage(user.id, url);
      } else {
        await updateProfilePicture(user.id, url);
      }
      await onSaved();
      setCaptured(null);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not update your photo. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-800">
            {MODE_COPY[mode].title}
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {captured ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captured.url}
                alt="Captured face preview"
                className="aspect-[4/3] w-full rounded-xl bg-stone-900 object-cover"
              />
              <p className="text-center text-sm text-stone-500">
                {MODE_COPY[mode].caption}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={saving}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {saving ? "Saving…" : "Use this photo"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-900">
                <CameraCapture
                  ref={cameraRef}
                  onError={(msg) => setError(msg)}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-full border-2 border-dashed border-white/50" />
                </div>
              </div>
              <p className="text-center text-xs text-stone-400">
                Front-facing camera only. Center your face and make sure the
                room is well lit.
              </p>
              <button
                type="button"
                onClick={handleCapture}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-800"
              >
                <Camera className="h-5 w-5" />
                Take photo
              </button>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
