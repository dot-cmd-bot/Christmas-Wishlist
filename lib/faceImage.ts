import { getSupabase } from "./supabase";
import { resizeImage } from "./itemImage";

const BUCKET = "faces";

export async function uploadFaceImage(
  faceRecognitionId: string,
  blob: Blob,
): Promise<string> {
  const path = `${faceRecognitionId}.jpg`;
  const resized = await resizeImage(blob);
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, resized, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
