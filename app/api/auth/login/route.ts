import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { setSessionCookie } from "@/lib/auth-server";
import { matchFace } from "@/lib/face-server";
import { toPublicUser } from "@/lib/public-user";
import type { ReferenceUser } from "@/lib/face-server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const raw = typeof body.image === "string" ? body.image : "";
  if (!raw) {
    return NextResponse.json({ ok: false, error: "No photo received." }, { status: 400 });
  }

  // Accept both raw base64 and data URLs.
  const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid photo data." }, { status: 400 });
  }
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Photo is missing or too large." },
      { status: 413 },
    );
  }

  const origin = new URL(req.url).origin;

  const { data: users, error } = await getServerSupabase()
    .from("users")
    .select("id, name, face_recognition_id, face_image_url");
  if (error) {
    console.error("[login] failed to load users:", error);
    return NextResponse.json({ ok: false, error: "Could not load login data." }, { status: 500 });
  }

  const refs = (users ?? []) as ReferenceUser[];
  let match: { userId: string } | null = null;
  try {
    match = await matchFace(buffer, refs, origin);
  } catch (err) {
    console.error("[login] face matching failed:", err);
    return NextResponse.json({ ok: false, error: "Face matching is unavailable." }, { status: 500 });
  }

  if (!match) {
    return NextResponse.json(
      { ok: false, error: "No match found. Make sure your face is well lit and try again." },
      { status: 401 },
    );
  }

  const { data: userRow, error: userError } = await getServerSupabase()
    .from("users")
    .select("*")
    .eq("id", match.userId)
    .maybeSingle();
  if (userError || !userRow) {
    console.error("[login] matched user lookup failed:", userError);
    return NextResponse.json({ ok: false, error: "Could not sign you in." }, { status: 500 });
  }

  await setSessionCookie(userRow.id);

  return NextResponse.json({ ok: true, user: toPublicUser(userRow) });
}
