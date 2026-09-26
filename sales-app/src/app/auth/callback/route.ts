import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EXPRESS_API_URL } from "@/lib/env";
import { OAUTH_VERIFIER_COOKIE, setSession } from "@/lib/session";

function readFlow(raw: string | undefined): { verifier: string; mode: "login" | "signup" } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.verifier !== "string") return null;
    return { verifier: parsed.verifier, mode: parsed.mode === "signup" ? "signup" : "login" };
  } catch {
    return null;
  }
}

// Google sends the user back here (via Supabase) with a one-time `code`.
// Trade it for a session using the verifier saved by /api/auth/google, then
// start the session exactly like a password login does. A login with a
// Google account that has no Karishava account goes to Create Account.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const store = await cookies();
  const flow = readFlow(store.get(OAUTH_VERIFIER_COOKIE)?.value);
  store.delete({ name: OAUTH_VERIFIER_COOKIE, path: "/auth/callback" });

  const failurePage = flow?.mode === "signup" ? "/register" : "/login";
  const fail = () => NextResponse.redirect(new URL(`${failurePage}?error=google`, req.url));
  const removed = () => NextResponse.redirect(new URL("/login?error=removed", req.url));

  // Supabase can reject a banned (removed) user before issuing a code, and
  // reports why in error_description.
  const errorDescription = req.nextUrl.searchParams.get("error_description") ?? "";
  if (errorDescription.toLowerCase().includes("banned")) {
    return removed();
  }

  if (!code || !flow) {
    return fail();
  }

  const exchangeRes = await fetch(`${EXPRESS_API_URL}/api/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, verifier: flow.verifier, mode: flow.mode }),
  });
  const exchangeJson = await exchangeRes.json().catch(() => null);

  if (exchangeRes.status === 404) {
    return NextResponse.redirect(new URL("/register?reason=no-account", req.url));
  }
  if (exchangeRes.status === 403) {
    return removed();
  }
  if (!exchangeJson?.success) {
    return fail();
  }

  const { accessToken, refreshToken, expiresAt } = exchangeJson.data;

  // Same check as /api/session: the account must have a profile.
  const meRes = await fetch(`${EXPRESS_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meJson = await meRes.json().catch(() => null);

  if (meRes.status === 403) {
    return removed();
  }
  if (!meJson?.success) {
    return fail();
  }

  await setSession({ accessToken, refreshToken, expiresAt });
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
