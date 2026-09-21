import { Router } from "express";
import { ApiError, sendError, sendSuccess } from "../../utils/http";
import { isValidEmail } from "../../utils/validation";
import { login, logout, registerUser } from "./auth.service";
import { requireAuth } from "./auth.middleware";

export const authRouter = Router();

// Public: anyone can create a Sales User account this way. The account's
// role is decided server-side by a Postgres trigger keyed off an admin email
// allowlist (see supabase/migrations) — it is never taken from this request.
authRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
      throw new ApiError(400, "name is required");
    }
    if (typeof email !== "string" || !isValidEmail(email)) {
      throw new ApiError(400, "A valid email is required");
    }
    if (typeof password !== "string" || password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    await registerUser(name.trim(), email.trim().toLowerCase(), password);
    sendSuccess(res, { registered: true }, 201);
  } catch (error) {
    sendError(res, error);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      throw new ApiError(400, "email and password are required");
    }

    const session = await login(email, password);
    sendSuccess(res, {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    sendError(res, error);
  }
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  try {
    await logout(req.auth!.accessToken);
    sendSuccess(res, { loggedOut: true });
  } catch (error) {
    sendError(res, error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  sendSuccess(res, {
    id: req.auth!.userId,
    email: req.auth!.email,
    profile: req.auth!.profile,
  });
});
