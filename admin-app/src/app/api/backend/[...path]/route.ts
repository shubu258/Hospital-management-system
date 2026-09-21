import { NextRequest, NextResponse } from "next/server";
import { EXPRESS_API_URL } from "@/lib/env";
import { getSession } from "@/lib/session";

// Thin same-origin proxy so client components can call the Express API
// without ever holding the access token themselves (it lives only in the
// httpOnly session cookie, read here on the server).
async function forward(req: NextRequest, path: string[]) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const targetUrl = new URL(`${EXPRESS_API_URL}/api/${path.join("/")}`);
  targetUrl.search = req.nextUrl.search;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
  };

  let body: BodyInit | undefined;
  const contentType = req.headers.get("content-type") ?? "";

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      body = await req.formData();
    } else {
      const text = await req.text();
      if (text) {
        body = text;
        headers["Content-Type"] = "application/json";
      }
    }
  }

  const res = await fetch(targetUrl, { method: req.method, headers, body });
  const responseText = await res.text();

  return new NextResponse(responseText, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  return forward(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: RouteContext) {
  return forward(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return forward(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  return forward(req, (await params).path);
}
