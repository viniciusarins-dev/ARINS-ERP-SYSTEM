import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@arins/shared";

import { env } from "./env.js";

/**
 * A client scoped to the caller's own JWT. Every query it makes runs as
 * that user against Postgres, so Row Level Security (is_org_member, etc.)
 * applies exactly as it would if the user queried the database directly —
 * this API is a thin proxy, not a privilege escalation.
 */
export function createUserClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anon client, used only to validate a bearer token via auth.getUser(). */
export function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
