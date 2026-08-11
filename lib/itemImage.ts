import { uploadImage } from "./upload";

const BUCKET = "item-images";

export async function resizeImage(file: Blob, maxDim = 800): Promise<Blob> {
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
      0.85,
    );
  });
}

/** Upload a (client-side resized) image via the authenticated server. */
export async function uploadItemImage(blob: Blob): Promise<string> {
  return uploadImage(BUCKET, blob);
}
