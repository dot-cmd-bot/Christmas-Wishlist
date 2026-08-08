"use client";

import { useRef, useState } from "react";
import { Camera, SwitchCamera } from "lucide-react";
import CameraCapture, {
  type CameraCaptureHandle,
} from "@/components/CameraCapture";

interface ImageCaptureProps {
  onCapture: (blob: Blob) => void;
  onError?: (message: string) => void;
}

export default function ImageCapture({
  onCapture,
  onError,
}: ImageCaptureProps) {
  const cameraRef = useRef<CameraCaptureHandle>(null);
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<"user" | "environment">("user");

  function handleCapture() {
    const canvas = cameraRef.current?.capture();
    if (!canvas) {
      const message = "Could not read the camera feed. Please try again.";
      setError(message);
      onError?.(message);
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-900">
      <div className="relative h-56">
        <CameraCapture
          ref={cameraRef}
          mirror={false}
          facingMode={facing}
          onError={onError}
        />
        <button
          type="button"
          onClick={() =>
            setFacing((f) => (f === "user" ? "environment" : "user"))
          }
          aria-label="Switch camera"
          title="Switch camera"
          className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-2 text-white backdrop-blur transition hover:bg-black/70"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 bg-white p-2">
        <p className="px-1 text-xs text-stone-500">
          Point the camera at the item.
        </p>
        <button
          type="button"
          onClick={handleCapture}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          <Camera className="h-4 w-4" />
          Capture
        </button>
      </div>
      {error && (
        <p className="bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
