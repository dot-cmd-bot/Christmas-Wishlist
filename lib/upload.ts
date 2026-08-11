/**
 * Client-side upload helper. Sends the (already resized) image to the
 * authenticated server route, which derives the storage path and uploads
 * with the service role. The anon key is never used on the client.
 */
export async function uploadImage(
  bucket: "item-images" | "faces",
  blob: Blob,
  mode?: "login" | "profile",
): Promise<string> {
  const base64 = await blobToBase64(blob);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, mode, image: base64 }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    url?: string;
    error?: string;
  };
  if (!res.ok || !body.ok || !body.url) {
    throw new Error(body.error ?? "Upload failed.");
  }
  return body.url;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === "string" ? result : "");
    };
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(blob);
  });
}
