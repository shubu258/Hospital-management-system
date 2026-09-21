import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EXPRESS_API_URL } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Public self-registration for sales users. The account's role isn't decided
// here or by the caller — a Postgres trigger assigns ADMIN or SALES_USER
// based on an email allowlist as soon as the auth user is created (see
// supabase/migrations). On success we log the new account straight in, the
// same way /api/session does, so registering also starts the session.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : undefined;
  const email = typeof body?.email === "string" ? body.email : undefined;
  const password = typeof body?.password === "string" ? body.password : undefined;

  if (!name || !email || !password) {
    return NextResponse.json(
      { success: false, error: { message: "Name, email and password are required" } },
      { status: 400 }
    );
  }

  const registerRes = await fetch(`${EXPRESS_API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const registerJson = await registerRes.json();

  if (!registerJson.success) {
    return NextResponse.json(registerJson, { status: registerRes.status });
  }

  const loginRes = await fetch(`${EXPRESS_API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json();

  if (!loginJson.success) {
    return NextResponse.json(loginJson, { status: loginRes.status });
  }

  const { accessToken, refreshToken, expiresAt } = loginJson.data;

  const meRes = await fetch(`${EXPRESS_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meJson = await meRes.json();

  if (!meJson.success) {
    return NextResponse.json(meJson, { status: meRes.status });
  }

  const store = await cookies();
  store.set(
    SESSION_COOKIE_NAME,
    JSON.stringify({ accessToken, refreshToken, expiresAt }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }
  );

  return NextResponse.json({ success: true, data: { profile: meJson.data.profile } });
}
