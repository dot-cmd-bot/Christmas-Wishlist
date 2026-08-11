import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native (NAPI) + TensorFlow.js + the Node build of face-api must load at
  // runtime from node_modules (the client never imports them).
  serverExternalPackages: [
    "@napi-rs/canvas",
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-backend-wasm",
    "@vladmandic/face-api",
  ],
};

export default nextConfig;
