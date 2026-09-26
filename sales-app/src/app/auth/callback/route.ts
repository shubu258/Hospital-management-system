import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EXPRESS_API_URL } from "@/lib/env";
import { OAUTH_VERIFIER_COOKIE, setSession } from "@/lib/session";

// Google sends the user back here (via Supabase) with a one-time `code`.
// Trade it for a session using the verifier saved by /api/auth/google, then
// start the session exactly like a password login does.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const store = await cookies();
  const verifier = store.get(OAUTH_VERIFIER_COOKIE)?.value;
  store.delete({ name: OAUTH_VERIFIER_COOKIE, path: "/auth/callback" });

  const fail = () => NextResponse.redirect(new URL("/login?error=google", req.url));

  if (!code || !verifier) {
    return fail();
  }

  const exchangeRes = await fetch(`${EXPRESS_API_URL}/api/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, verifier }),
  });
  const exchangeJson = await exchangeRes.json().catch(() => null);

  if (!exchangeJson?.success) {
    return fail();
  }

  const { accessToken, refreshToken, expiresAt } = exchangeJson.data;

  // Same check as /api/session: the account must have a profile.
  const meRes = await fetch(`${EXPRESS_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meJson = await meRes.json().catch(() => null);

  if (!meJson?.success) {
    return fail();
  }

  await setSession({ accessToken, refreshToken, expiresAt });
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
