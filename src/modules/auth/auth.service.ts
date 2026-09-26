import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import { supabaseAdmin, supabaseAnon } from "../../config/supabase";
import { ApiError } from "../../utils/http";
import type { Database } from "../../types/database";
import type { Profile } from "./auth.types";

export const REMOVED_ACCOUNT_MESSAGE =
  "This account has been removed from the team. Contact your administrator.";

export async function login(email: string, password: string) {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    const account = await findAccount(email);
    if (!account) {
      throw new ApiError(404, "No account found for this email. Please create one.");
    }
    if (account.removed) {
      throw new ApiError(403, REMOVED_ACCOUNT_MESSAGE);
    }
    throw new ApiError(401, "Invalid email or password");
  }

  return data.session;
}

// Every auth user gets a profile from the handle_new_user trigger, so a
// profile lookup is how we tell "wrong password" apart from "no account".
// This deliberately reveals whether an email is registered, so the UI can
// send unknown emails to the Create Account page.
export async function findAccount(email: string): Promise<{ removed: boolean } | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, removed_at")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    throw new ApiError(500, error.message);
  }
  return data ? { removed: data.removed_at !== null } : null;
}

export async function registerUser(name: string, email: string, password: string) {
  // A removed member's auth account is kept (and banned), so createUser
  // would fail anyway; this just explains why.
  if ((await findAccount(email))?.removed) {
    throw new ApiError(403, REMOVED_ACCOUNT_MESSAGE);
  }

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

// ---------------------------------------------------------------------------
// Google OAuth (PKCE)
//
// The PKCE code verifier normally lives in the browser's storage between the
// redirect to Google and the callback. This backend is stateless, so instead
// we hand the verifier back to the caller (the Next.js app keeps it in an
// httpOnly cookie) and it's passed back in at exchange time. Each call gets a
// throwaway client whose storage is just an in-memory map.
// ---------------------------------------------------------------------------

const OAUTH_STORAGE_KEY = "karishava-oauth";
const OAUTH_VERIFIER_KEY = `${OAUTH_STORAGE_KEY}-code-verifier`;

function createOAuthClient(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      // Must be true, or supabase-js ignores `storage` below and the
      // verifier can't be read back. The storage is per-call and in-memory.
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: OAUTH_STORAGE_KEY,
      storage: {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => void store.set(key, value),
        removeItem: (key) => void store.delete(key),
      },
    },
  });
  return { client, store };
}

export async function startGoogleOAuth(redirectTo: string) {
  const { client, store } = createOAuthClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });

  const verifier = store.get(OAUTH_VERIFIER_KEY);
  if (error || !data.url || !verifier) {
    throw new ApiError(400, error?.message ?? "Could not start Google sign-in");
  }

  return { url: data.url, verifier };
}

// `mode` is where the user started: "signup" (Create Account page) may create
// a new account; "login" may not. Supabase creates the account either way, so
// a login that turns out to be brand new is undone and reported as 404.
export async function exchangeGoogleCode(
  code: string,
  verifier: string,
  mode: "login" | "signup"
) {
  const { client } = createOAuthClient({ [OAUTH_VERIFIER_KEY]: verifier });
  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    // Removed members are banned in Supabase Auth, which rejects the grant.
    if (error?.message.toLowerCase().includes("banned")) {
      throw new ApiError(403, REMOVED_ACCOUNT_MESSAGE);
    }
    throw new ApiError(401, error?.message ?? "Google sign-in failed");
  }

  if (mode === "login" && isFirstSignIn(data.session.user)) {
    await supabaseAdmin.auth.admin.deleteUser(data.session.user.id);
    throw new ApiError(404, "No account found for this email. Please create one.");
  }

  return data.session;
}

// On an account's very first sign-in, last_sign_in_at is stamped within
// moments of created_at. Any later sign-in is well after it.
function isFirstSignIn(user: { created_at: string; last_sign_in_at?: string }) {
  if (!user.last_sign_in_at) return true;
  const gap = Date.parse(user.last_sign_in_at) - Date.parse(user.created_at);
  return gap < 10_000;
}

// ---------------------------------------------------------------------------
// Forgot / reset password
//
// The Supabase "Reset Password" email template must link to
//   {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
// so the reset page receives a token hash we can verify server-side.
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const account = await findAccount(email);
  if (!account) {
    throw new ApiError(404, "No account found for this email. Please create one.");
  }
  if (account.removed) {
    throw new ApiError(403, REMOVED_ACCOUNT_MESSAGE);
  }

  const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, { redirectTo });
  if (error && error.status === 429) {
    throw new ApiError(429, "Too many reset requests. Please try again later.");
  }
  if (error) {
    console.error("resetPasswordForEmail failed:", error.message);
  }
}

export async function resetPassword(tokenHash: string, password: string) {
  const { client } = createOAuthClient();
  const { data, error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error || !data.user) {
    throw new ApiError(400, "This reset link is invalid or has expired");
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
    password,
  });
  if (updateError) {
    throw new ApiError(400, updateError.message);
  }

  // Sign out every other session, so a stolen session doesn't survive a reset.
  if (data.session) {
    await supabaseAdmin.auth.admin.signOut(data.session.access_token, "global");
  }
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
