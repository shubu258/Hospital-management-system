import { NextRequest, NextResponse } from "next/server";
import { EXPRESS_API_URL } from "@/lib/env";
import { OAUTH_VERIFIER_COOKIE } from "@/lib/session";

// Starts Google sign-in: asks the backend for Google's consent URL, keeps the
// PKCE verifier in a short-lived httpOnly cookie for /auth/callback, and
// sends the browser off to Google.
export async function GET(req: NextRequest) {
  const redirectTo = new URL("/auth/callback", req.url).toString();

  const startRes = await fetch(`${EXPRESS_API_URL}/api/auth/google/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirectTo }),
  });
  const startJson = await startRes.json().catch(() => null);

  if (!startJson?.success) {
    return NextResponse.redirect(new URL("/login?error=google", req.url));
  }

  const res = NextResponse.redirect(startJson.data.url);
  res.cookies.set(OAUTH_VERIFIER_COOKIE, startJson.data.verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: 60 * 10,
  });
  return res;
}
