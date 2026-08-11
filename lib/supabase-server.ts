import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isServerConfigured = Boolean(supabaseUrl && serviceRoleKey);

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service_role key.
 * Bypasses RLS — must ONLY be used from server actions / route handlers
 * that have already authenticated the caller.
 */
export function getServerSupabase(): SupabaseClient {
  if (!isServerConfigured) {
    throw new Error(
      "Server is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local",
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
