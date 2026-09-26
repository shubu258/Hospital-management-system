import { cookies } from "next/headers";

// Deliberately distinct from admin-app's cookie name — see the comment on
// that file. This one intentionally does NOT match admin-app's.
export const SESSION_COOKIE_NAME = "karishava_sales_session";

// Holds the Google sign-in PKCE verifier between /api/auth/google and
// /auth/callback. Scoped to the callback path and expires in 10 minutes.
export const OAUTH_VERIFIER_COOKIE = "karishava_sales_oauth_verifier";

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function setSession(session: SessionData, rememberMe = true): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  });
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}
