import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EXPRESS_API_URL } from "@/lib/env";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/session";

// This app is for administrators only; a Sales User's credentials are valid
// against Supabase Auth but must not be able to open this console.
const REQUIRED_ROLE = "ADMIN";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : undefined;
  const password = typeof body?.password === "string" ? body.password : undefined;
  const rememberMe = body?.rememberMe !== false;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: { message: "Email and password are required" } },
      { status: 400 }
    );
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

  if (meJson.data.profile.role !== REQUIRED_ROLE) {
    return NextResponse.json(
      {
        success: false,
        error: { message: "This account does not have access to the admin console." },
      },
      { status: 403 }
    );
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
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
    }
  );

  return NextResponse.json({ success: true, data: { profile: meJson.data.profile } });
}

export async function DELETE() {
  const session = await getSession();
  const store = await cookies();

  if (session) {
    await fetch(`${EXPRESS_API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }).catch(() => undefined);
  }

  store.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true, data: { loggedOut: true } });
}
