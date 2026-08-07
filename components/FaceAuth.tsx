"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, ScanFace } from "lucide-react";
import CameraCapture, {
  type CameraCaptureHandle,
} from "@/components/CameraCapture";
import { buildReferences, identifyUser } from "@/lib/recognition";
import { fetchUsers } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
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

export default function FaceAuth({ onSuccess }: FaceAuthProps) {
  const cameraRef = useRef<CameraCaptureHandle>(null);
  const usersRef = useRef<User[]>([]);
  const [phase, setPhase] = useState<Phase>("initializing");
  const [message, setMessage] = useState("");

  const fail = useCallback((next: Phase, msg: string) => {
    setPhase(next);
    setMessage(msg);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!isSupabaseConfigured) {
        fail(
          "error",
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
        );
        return;
      }
      try {
        const users = await fetchUsers();
        if (cancelled) return;
        usersRef.current = users;
        await buildReferences(users);
        if (cancelled) return;
        setPhase("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          fail(
            "error",
            "Could not load login data. Check your Supabase connection and that reference photos exist.",
          );
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [fail]);

  async function handleRecognize() {
    if (phase === "checking") return;
    const users = usersRef.current;
    if (users.length === 0) {
      fail("error", "No registered users found. Seed the database first.");
      return;
    }

    const frame = cameraRef.current?.capture();
    if (!frame) {
      fail("no-match", "No camera frame available. Make sure your face is visible.");
      return;
    }

    setPhase("checking");
    setMessage("Recognizing your face…");

    try {
      const outcome = await identifyUser(users, frame);
      if (outcome.status === "matched") {
        onSuccess(outcome.match.user);
        return;
      }
      switch (outcome.status) {
        case "no-face":
          fail(
            "no-match",
            "No face detected in the frame. Center your face, improve lighting, and try again.",
          );
          break;
        case "no-refs":
          fail(
            "no-match",
            "Couldn't prepare any reference photos. Check that each member has a clear face photo in public/faces.",
          );
          break;
        case "no-match":
          fail(
            "no-match",
            "No match found. Make sure your face is well lit and try again.",
          );
          break;
      }
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
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-full border-2 border-dashed border-white/50" />
        </div>
      </div>

      {phase === "initializing" && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading face recognition…
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
