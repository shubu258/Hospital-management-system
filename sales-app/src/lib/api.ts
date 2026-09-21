import { getSession } from "./session";
import { EXPRESS_API_URL } from "./env";
import type { ApiResponse } from "./types";

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Server-only: used directly inside Server Components / Server Actions to
// fetch data. Reads the session cookie and attaches the bearer token itself,
// so callers never see or handle the access token.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getSession();
  if (!session) {
    throw new ApiRequestError(401, "Not authenticated");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body && typeof init.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${EXPRESS_API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiRequestError(res.status, json.error.message);
  }
  return json.data;
}
