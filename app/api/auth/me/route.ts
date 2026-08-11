import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { getServerSupabase } from "@/lib/supabase-server";
import { toPublicUser } from "@/lib/public-user";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { data: user, error } = await getServerSupabase()
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: toPublicUser(user) });
}
