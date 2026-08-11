import path from "node:path";
import fs from "node:fs";
import { loadImage, createCanvas } from "@napi-rs/canvas";
import { getServerSupabase } from "./supabase-server";

// Server-side face recognition using @vladmandic/face-api with the bundled
// TensorFlow.js WASM/CPU backend and @napi-rs/canvas for image decoding.
// No native (node-gyp) builds required, so it runs on Vercel Node functions.

const MATCH_THRESHOLD = 0.45;
const MAX_INPUT_DIM = 480;

type FaceApiModule = typeof import("@vladmandic/face-api");

let faceapiPromise: Promise<FaceApiModule> | null = null;
let modelsPromise: Promise<void> | null = null;
let envReady = false;

/**
 * Locate the face-api model weights. Bundlers rewrite `require.resolve`,
 * so discover the package's `model/` directory at runtime by walking up from
 * the compiled module, falling back to the committed copy in public/models.
 */
function modelsDir(): string {
  const pkgDir = path.join("node_modules", "@vladmandic", "face-api", "model");
  const candidates = [
    path.join(process.cwd(), pkgDir),
  ];
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    candidates.push(path.join(dir, pkgDir));
    dir = path.dirname(dir);
  }
  const publicCandidate = path.join(process.cwd(), "public", "models");
  candidates.push(publicCandidate);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return publicCandidate;
}

async function getFaceApi(): Promise<FaceApiModule> {
  if (!faceapiPromise) {
    faceapiPromise = import("@vladmandic/face-api/dist/face-api.node-wasm.js");
  }
  const faceapi = await faceapiPromise;

  if (!envReady) {
    const { Canvas, Image, ImageData } = await import("@napi-rs/canvas");
    // face-api's env expects DOM element types; @napi-rs/canvas satisfies the
    // duck-typed runtime contract, so we cast through `any`.
    faceapi.env.monkeyPatch({
      Canvas: Canvas as unknown as typeof globalThis.HTMLCanvasElement,
      Image: Image as unknown as typeof globalThis.HTMLImageElement,
      ImageData: ImageData as unknown as typeof globalThis.ImageData,
      createCanvasElement: ((w: number, h: number) =>
        createCanvas(w ?? 300, h ?? 150)) as unknown as () => HTMLCanvasElement,
      createImageElement: (() => new Image()) as unknown as () => HTMLImageElement,
    });
    envReady = true;
  }
  return faceapi;
}

async function loadModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const faceapi = await getFaceApi();
      const tf = faceapi.tf as unknown as { setBackend: (b: string) => Promise<void>; ready: () => Promise<void> };
      await tf.setBackend("cpu");
      await tf.ready();
      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsDir());
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir());
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir());
    })();
  }
  return modelsPromise;
}

/** Decode a JPEG/PNG buffer into a canvas, optionally downscaling. */
async function decodeToCanvas(buffer: Buffer) {
  const img = await loadImage(buffer);
  const scale = Math.min(1, MAX_INPUT_DIM / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas as unknown as ReturnType<typeof createCanvas>;
}

async function descriptorForCanvas(
  faceapi: FaceApiModule,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any,
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export interface ReferenceUser {
  id: string;
  name: string;
  face_recognition_id: string;
  face_image_url: string | null;
}

interface StoredDescriptor {
  user_id: string;
  descriptor: number[];
}

/**
 * Returns reference descriptors for every member, computing and persisting
 * any that are missing (e.g. after a member updates their login photo).
 * Uses the member's uploaded login photo (face bucket) — the reference
 * photos must be reachable over HTTP, so login photos are stored in the
 * public `faces` bucket.
 */
export async function ensureDescriptors(
  users: ReferenceUser[],
  appOrigin: string,
): Promise<Map<string, Float32Array>> {
  const faceapi = await getFaceApi();
  await loadModels();

  const ids = users.map((u) => u.id);
  const result = new Map<string, Float32Array>();
  if (ids.length === 0) return result;

  const { data: stored, error } = await getServerSupabase()
    .from("face_descriptors")
    .select("user_id, descriptor")
    .in("user_id", ids);
  if (error) throw error;

  const byUser = new Map<string, Float32Array>();
  for (const row of (stored ?? []) as StoredDescriptor[]) {
    if (Array.isArray(row.descriptor) && row.descriptor.length > 0) {
      byUser.set(row.user_id, Float32Array.from(row.descriptor));
    }
  }

  const missing: ReferenceUser[] = users.filter((u) => !byUser.has(u.id));
  const toUpsert: { user_id: string; descriptor: number[] }[] = [];

  // Recompute any missing/stale descriptors sequentially (CPU-bound).
  for (const user of missing) {
    const url =
      user.face_image_url ??
      `${appOrigin}/faces/${encodeURIComponent(user.face_recognition_id)}.jpg`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.warn(`[face-server] no reference photo for ${user.name}: ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const canvas = await decodeToCanvas(buf);
      const descriptor = await descriptorForCanvas(faceapi, canvas);
      if (descriptor) {
        const arr = Array.from(descriptor);
        toUpsert.push({ user_id: user.id, descriptor: arr });
        byUser.set(user.id, descriptor);
      } else {
        console.warn(`[face-server] no face detected in reference for ${user.name}`);
      }
    } catch (err) {
      console.warn(`[face-server] could not build reference for ${user.name}:`, err);
    }
  }

  if (toUpsert.length > 0) {
    await getServerSupabase().from("face_descriptors").upsert(toUpsert, {
      onConflict: "user_id",
    });
  }

  for (const u of users) {
    const d = byUser.get(u.id);
    if (d) result.set(u.id, d);
  }
  return result;
}

export async function invalidateDescriptor(userId: string): Promise<void> {
  await getServerSupabase().from("face_descriptors").delete().eq("user_id", userId);
}

export interface FaceMatchResult {
  userId: string;
  distance: number;
}

/**
 * Verifies an uploaded login photo against the enrolled member descriptors.
 * Returns the matched user id (or null when the face does not match anyone).
 */
export async function matchFace(
  imageBuffer: Buffer,
  users: ReferenceUser[],
  appOrigin: string,
): Promise<FaceMatchResult | null> {
  const faceapi = await getFaceApi();
  await loadModels();

  const canvas = await decodeToCanvas(imageBuffer);
  const captured = await descriptorForCanvas(faceapi, canvas);
  if (!captured) return null;

  const refs = await ensureDescriptors(users, appOrigin);

  let best: FaceMatchResult | null = null;
  for (const [userId, ref] of refs) {
    const d = faceapi.euclideanDistance(captured, ref);
    if (!best || d < best.distance) {
      best = { userId, distance: d };
    }
  }

  if (!best || best.distance > MATCH_THRESHOLD) return null;
  return best;
}
