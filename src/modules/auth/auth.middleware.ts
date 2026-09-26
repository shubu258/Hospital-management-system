import { NextFunction, Request, Response } from "express";
import { createUserClient } from "../../config/supabase";
import { ApiError, sendError } from "../../utils/http";
import { getProfile, getUserFromToken, REMOVED_ACCOUNT_MESSAGE } from "./auth.service";
import type { UserRole } from "../../types/database";

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing or invalid Authorization header");
  }
  return header.slice("Bearer ".length);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = extractBearerToken(req);
    const user = await getUserFromToken(accessToken);
    const supabase = createUserClient(accessToken);
    const profile = await getProfile(supabase, user.id);

    // Checked on every request, so removing a member cuts off sessions they
    // already have instead of waiting for their access token to expire.
    if (profile.removed_at) {
      throw new ApiError(403, REMOVED_ACCOUNT_MESSAGE);
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      profile,
      accessToken,
      supabase,
    };

    next();
  } catch (error) {
    sendError(res, error);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.profile.role)) {
      sendError(res, new ApiError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
