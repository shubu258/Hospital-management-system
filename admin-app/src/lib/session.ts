import { cookies } from "next/headers";

// Deliberately distinct from sales-app's cookie name. Cookies aren't scoped
// by port, only by hostname — sharing a name would let a sales-app session
// on localhost:3001 pass this app's proxy (which only checks whether *a*
// session cookie exists, not whose), reaching this admin console before the
// backend's role check finally rejects it.
export const SESSION_COOKIE_NAME = "karishava_admin_session";

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
