import { uploadImage } from "./upload";

const BUCKET = "faces";

/** Upload the member's login photo (overwrites <face_recognition_id>.jpg). */
export function uploadFaceImage(blob: Blob): Promise<string> {
  return uploadImage(BUCKET, blob, "login");
}

/** Upload the member's public profile picture. */
export function uploadProfilePicture(blob: Blob): Promise<string> {
  return uploadImage(BUCKET, blob, "profile");
}
