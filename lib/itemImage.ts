import { getSupabase } from "./supabase";

const BUCKET = "item-images";
const MAX_DIM = 800;
const JPEG_QUALITY = 0.85;

export async function resizeImage(file: Blob, maxDim = MAX_DIM): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is not supported.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode the image.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function uploadItemImage(
  ownerId: string,
  blob: Blob,
): Promise<string> {
  const path = `${ownerId}/${crypto.randomUUID()}.jpg`;
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function imagePathFromUrl(publicUrl: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export async function deleteItemImage(
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl) return;
  const path = imagePathFromUrl(publicUrl);
  if (!path) return;
  await getSupabase().storage.from(BUCKET).remove([path]);
}
