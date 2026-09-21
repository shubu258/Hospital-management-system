import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Reached when a Server Component finds a session cookie that no longer
// resolves to a valid Supabase access token (it expired, or was revoked by a
// logout elsewhere). Clears the stale cookie before sending the user back to
// /login — a plain `redirect("/login")` from the Server Component that found
// this can't clear the cookie itself, which would otherwise loop forever
// (proxy.ts sees the cookie is still present and bounces /login -> /dashboard).
export async function GET(req: NextRequest) {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  return NextResponse.redirect(new URL("/login?expired=1", req.url));
}
