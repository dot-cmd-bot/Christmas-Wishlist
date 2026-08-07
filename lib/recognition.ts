import { computeDescriptor, euclideanDistance, facePhotoUrl, loadFaceModels, loadImage } from "./face";
import type { User } from "./types";

export const MATCH_THRESHOLD = 0.6;

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
      } else {
        console.warn(
          `[recognition] No face detected in reference photo for ${user.name} (${user.face_recognition_id})`,
        );
      }
    } catch (err) {
      console.warn(
        `[recognition] Could not build reference for ${user.name}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  cachedReferences = { key, refs };
  return refs;
}

export interface MatchResult {
  user: User;
  distance: number;
}

export type IdentifyOutcome =
  | { status: "matched"; match: MatchResult }
  | { status: "no-face" }
  | { status: "no-refs" }
  | { status: "no-match"; closestDistance: number };

export async function identifyUser(
  users: User[],
  input: HTMLVideoElement | HTMLCanvasElement,
): Promise<IdentifyOutcome> {
  const refs = await buildReferences(users);
  if (refs.length === 0) return { status: "no-refs" };

  let captured: Float32Array | null = null;
  try {
    captured = await computeDescriptor(input);
  } catch {
    // Detection raised (e.g. a spurious box that failed landmark fitting);
    // treat it the same as "no face reliably detected".
  }
  if (!captured) return { status: "no-face" };

  let best: { userId: string; distance: number } | null = null;
  for (const ref of refs) {
    const d = await euclideanDistance(captured, ref.descriptor);
    if (!best || d < best.distance) {
      best = { userId: ref.userId, distance: d };
    }
  }

  if (!best || best.distance > MATCH_THRESHOLD) {
    return { status: "no-match", closestDistance: best?.distance ?? Number.POSITIVE_INFINITY };
  }

  const user = users.find((u) => u.id === best.userId);
  return user
    ? { status: "matched", match: { user, distance: best.distance } }
    : { status: "no-match", closestDistance: best.distance };
}
