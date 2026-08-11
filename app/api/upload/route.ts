import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_BUCKETS = new Set(["item-images", "faces"]);

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { bucket?: string; mode?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const bucket = body.bucket;
  if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ ok: false, error: "Invalid bucket." }, { status: 400 });
  }

  const raw = typeof body.image === "string" ? body.image : "";
  if (!raw) {
    return NextResponse.json({ ok: false, error: "No image received." }, { status: 400 });
  }
  const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid image data." }, { status: 400 });
  }
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Image is missing or too large." },
      { status: 413 },
    );
  }

  const db = getServerSupabase();

  // Derive the storage path server-side; the client never picks a path.
  let path: string;
  if (bucket === "faces") {
    const { data: user, error: userError } = await db
      .from("users")
      .select("face_recognition_id")
      .eq("id", userId)
      .maybeSingle();
    if (userError || !user?.face_recognition_id) {
      return NextResponse.json({ ok: false, error: "Could not resolve your photo path." }, { status: 500 });
    }
    const mode = body.mode === "profile" ? "profile" : "login";
    path = mode === "profile"
      ? `profile/${user.face_recognition_id}.jpg`
      : `${user.face_recognition_id}.jpg`;
  } else {
    path = `${userId}/${crypto.randomUUID()}.jpg`;
  }

  const { error } = await db.storage
    .from(bucket)
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
  if (error) {
    console.error("[upload] storage upload failed:", error);
    return NextResponse.json({ ok: false, error: "Could not save the image." }, { status: 500 });
  }

  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
