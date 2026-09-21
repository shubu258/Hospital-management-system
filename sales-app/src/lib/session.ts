import { cookies } from "next/headers";

// Deliberately distinct from admin-app's cookie name — see the comment on
// that file. This one intentionally does NOT match admin-app's.
export const SESSION_COOKIE_NAME = "karishava_sales_session";

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}
