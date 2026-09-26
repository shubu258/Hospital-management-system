import { Router } from "express";
import { ApiError, sendError, sendSuccess } from "../../utils/http";
import { isValidEmail } from "../../utils/validation";
import {
  exchangeGoogleCode,
  login,
  logout,
  registerUser,
  resetPassword,
  sendPasswordResetEmail,
  startGoogleOAuth,
} from "./auth.service";
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

// Google sign-in, step 1: returns the Google consent URL plus the PKCE
// verifier the caller must hold on to until step 2. `redirectTo` must be in
// the Supabase project's Redirect URLs allowlist, which Supabase enforces.
authRouter.post("/google/start", async (req, res) => {
  try {
    const { redirectTo } = req.body ?? {};
    if (typeof redirectTo !== "string" || !redirectTo) {
      throw new ApiError(400, "redirectTo is required");
    }

    sendSuccess(res, await startGoogleOAuth(redirectTo));
  } catch (error) {
    sendError(res, error);
  }
});

// Google sign-in, step 2: trades the callback's code for a session. New
// Google users get a profile from the same Postgres trigger as registration.
authRouter.post("/google/exchange", async (req, res) => {
  try {
    const { code, verifier } = req.body ?? {};
    if (typeof code !== "string" || typeof verifier !== "string") {
      throw new ApiError(400, "code and verifier are required");
    }

    const session = await exchangeGoogleCode(code, verifier);
    sendSuccess(res, {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    sendError(res, error);
  }
});

// Always reports success for a well-formed email, whether or not an account
// exists, so this can't be used to enumerate users.
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email, redirectTo } = req.body ?? {};
    if (typeof email !== "string" || !isValidEmail(email)) {
      throw new ApiError(400, "A valid email is required");
    }
    if (typeof redirectTo !== "string" || !redirectTo) {
      throw new ApiError(400, "redirectTo is required");
    }

    await sendPasswordResetEmail(email.trim().toLowerCase(), redirectTo);
    sendSuccess(res, { sent: true });
  } catch (error) {
    sendError(res, error);
  }
});

authRouter.post("/reset-password", async (req, res) => {
  try {
    const { tokenHash, password } = req.body ?? {};
    if (typeof tokenHash !== "string" || !tokenHash) {
      throw new ApiError(400, "tokenHash is required");
    }
    if (typeof password !== "string" || password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    await resetPassword(tokenHash, password);
    sendSuccess(res, { reset: true });
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
