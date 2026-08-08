"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export interface CameraCaptureHandle {
  capture: () => HTMLCanvasElement | null;
  getVideo: () => HTMLVideoElement | null;
}

interface CameraCaptureProps {
  onError?: (message: string) => void;
  mirror?: boolean;
}

const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(
  function CameraCapture({ onError, mirror = true }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        capture: () => {
          const video = videoRef.current;
          if (!video || video.videoWidth === 0) return null;
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas;
        },
        getVideo: () => videoRef.current,
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      async function start() {
        if (!navigator.mediaDevices?.getUserMedia) {
          onError?.("Camera is not supported on this device or browser.");
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            await video.play().catch(() => {});
          }
        } catch {
          onError?.(
            "Unable to access the camera. Please allow camera permission and try again.",
          );
        }
      }
      void start();
      return () => {
        cancelled = true;
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover ${mirror ? "-scale-x-100" : ""}`}
      />
    );
  },
);

export default CameraCapture;
