import { getSupabase } from "./supabase";
import { resizeImage } from "./itemImage";

const BUCKET = "faces";

async function uploadToBucket(path: string, blob: Blob): Promise<string> {
  const resized = await resizeImage(blob);
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, resized, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function uploadFaceImage(
  faceRecognitionId: string,
  blob: Blob,
): Promise<string> {
  return uploadToBucket(`${faceRecognitionId}.jpg`, blob);
}

export function uploadProfilePicture(
  faceRecognitionId: string,
  blob: Blob,
): Promise<string> {
  return uploadToBucket(`profile/${faceRecognitionId}.jpg`, blob);
}
