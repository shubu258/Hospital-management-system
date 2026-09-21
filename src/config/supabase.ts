import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { Database } from "../types/database";

// Uses the anon key; respects Row Level Security. Use for user-scoped requests.
export const supabaseAnon: SupabaseClient<Database> = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Uses the service role key; bypasses Row Level Security. Server-only, never
// expose to the frontend.
export const supabaseAdmin: SupabaseClient<Database> = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Scoped to a single user's access token, so PostgREST evaluates RLS as that
// user (auth.uid() resolves to them) instead of as an anonymous request.
export function createUserClient(accessToken: string): SupabaseClient<Database> {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
