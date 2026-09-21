import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin, supabaseAnon } from "../../config/supabase";
import { ApiError } from "../../utils/http";
import type { Database } from "../../types/database";
import type { Profile } from "./auth.types";

export async function login(email: string, password: string) {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new ApiError(401, "Invalid email or password");
  }

  return data.session;
}

export async function registerUser(name: string, email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    const status = error.message.toLowerCase().includes("already") ? 409 : 400;
    throw new ApiError(status, error.message);
  }

  return data.user;
}

export async function logout(accessToken: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, "global");
  if (error) {
    throw new ApiError(400, error.message);
  }
}

export async function getUserFromToken(accessToken: string) {
  const { data, error } = await supabaseAnon.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new ApiError(401, "Invalid or expired session");
  }
  return data.user;
}

export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, error.message);
  }
  if (!data) {
    throw new ApiError(403, "No profile found for this account");
  }
  return data;
}
