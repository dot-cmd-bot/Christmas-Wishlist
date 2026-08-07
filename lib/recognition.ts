import { computeDescriptor, euclideanDistance, facePhotoUrl, loadFaceModels, loadImage } from "./face";
import type { User } from "./types";

export const MATCH_THRESHOLD = 0.5;

export interface ReferenceFace {
  userId: string;
  name: string;
  descriptor: Float32Array;
}

let cachedReferences: { key: string; refs: ReferenceFace[] } | null = null;

function keyFor(users: User[]): string {
  return users
    .map((u) => u.id)
    .sort()
    .join(",");
}

export async function buildReferences(users: User[]): Promise<ReferenceFace[]> {
  const key = keyFor(users);
  if (cachedReferences?.key === key) return cachedReferences.refs;

  await loadFaceModels();

  const refs: ReferenceFace[] = [];
  for (const user of users) {
    if (!user.face_recognition_id) continue;
    try {
      const img = await loadImage(facePhotoUrl(user.face_recognition_id));
      const descriptor = await computeDescriptor(img);
      if (descriptor) {
        refs.push({ userId: user.id, name: user.name, descriptor });
      }
    } catch {
      // Skip users without a usable reference photo (e.g. SVG placeholders).
    }
  }

  cachedReferences = { key, refs };
  return refs;
}

export interface MatchResult {
  user: User;
  distance: number;
}

export async function identifyUser(
  users: User[],
  input: HTMLVideoElement | HTMLCanvasElement,
): Promise<MatchResult | null> {
  const refs = await buildReferences(users);
  if (refs.length === 0) return null;

  const captured = await computeDescriptor(input);
  if (!captured) return null;

  let best: { userId: string; distance: number } | null = null;
  for (const ref of refs) {
    const d = await euclideanDistance(captured, ref.descriptor);
    if (!best || d < best.distance) {
      best = { userId: ref.userId, distance: d };
    }
  }

  if (!best || best.distance > MATCH_THRESHOLD) return null;

  const user = users.find((u) => u.id === best.userId);
  return user ? { user, distance: best.distance } : null;
}
