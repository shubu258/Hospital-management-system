import { NextRequest, NextResponse } from "next/server";
import { EXPRESS_API_URL } from "@/lib/env";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : undefined;

  if (!email) {
    return NextResponse.json(
      { success: false, error: { message: "Email is required" } },
      { status: 400 }
    );
  }

  const res = await fetch(`${EXPRESS_API_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      redirectTo: new URL("/reset-password", req.url).toString(),
    }),
  });

  return NextResponse.json(await res.json(), { status: res.status });
}
