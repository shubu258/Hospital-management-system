import { NextRequest, NextResponse } from "next/server";
import { EXPRESS_API_URL } from "@/lib/env";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tokenHash = typeof body?.tokenHash === "string" ? body.tokenHash : undefined;
  const password = typeof body?.password === "string" ? body.password : undefined;

  if (!tokenHash || !password) {
    return NextResponse.json(
      { success: false, error: { message: "Reset link and new password are required" } },
      { status: 400 }
    );
  }

  const res = await fetch(`${EXPRESS_API_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenHash, password }),
  });

  return NextResponse.json(await res.json(), { status: res.status });
}
