"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, ScanFace } from "lucide-react";
import CameraCapture, {
  type CameraCaptureHandle,
} from "@/components/CameraCapture";
import type { User } from "@/lib/types";

type Phase =
  | "initializing"
  | "ready"
  | "checking"
  | "no-match"
  | "camera-error"
  | "error";

interface FaceAuthProps {
  onSuccess: (user: User) => void;
}

interface LoginResponse {
  ok?: boolean;
  user?: User;
  error?: string;
}

export default function FaceAuth({ onSuccess }: FaceAuthProps) {
  const cameraRef = useRef<CameraCaptureHandle>(null);
  const [phase, setPhase] = useState<Phase>("initializing");
  const [message, setMessage] = useState("");

  const fail = useCallback((next: Phase, msg: string) => {
    setPhase(next);
    setMessage(msg);
  }, []);

  async function handleRecognize() {
    if (phase === "checking") return;

    const frame = cameraRef.current?.capture();
    if (!frame) {
      fail("no-match", "No camera frame available. Make sure your face is visible.");
      return;
    }

    setPhase("checking");
    setMessage("Recognizing your face…");

    try {
      const dataUrl = frame.toDataURL("image/jpeg", 0.92);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const body = (await res.json().catch(() => ({}))) as LoginResponse;

      if (res.ok && body.ok && body.user) {
        onSuccess(body.user);
        return;
      }
      fail("no-match", body.error ?? "No match found. Please try again.");
    } catch (err) {
      console.error(err);
      fail("error", "Something went wrong while recognizing your face.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl bg-stone-900 shadow-xl ring-1 ring-black/10">
        <CameraCapture
          ref={cameraRef}
          onError={(msg) => fail("camera-error", msg)}
          onReady={() => setPhase((p) => (p === "initializing" ? "ready" : p))}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-full border-2 border-dashed border-white/50" />
        </div>
      </div>

      {phase === "initializing" && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting camera…
        </div>
      )}

      {phase === "checking" && (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Recognizing your face…
        </div>
      )}

      {message && phase !== "checking" && (
        <p
          className={`text-center text-sm ${
            phase === "ready" ? "text-stone-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      {phase !== "initializing" && phase !== "checking" && (
        <button
          type="button"
          onClick={handleRecognize}
          disabled={phase === "camera-error"}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "ready" ? <Camera className="h-5 w-5" /> : <ScanFace className="h-5 w-5" />}
          {phase === "ready" ? "Recognize me" : "Try again"}
        </button>
      )}

      <p className="max-w-sm text-center text-xs text-stone-400">
        For best results, face the camera in a well-lit room.
      </p>
    </div>
  );
}
