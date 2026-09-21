import { Router } from "express";
import { requireAuth, requireRole } from "../auth";
import { sendError, sendSuccess } from "../../utils/http";
import { listDirectory, listSalesUsers } from "./users.service";

export const usersRouter = Router();

// Open to any authenticated user — used to resolve teammates' names now
// that leads are visible to the whole team, not just their creator/owner.
usersRouter.get("/directory", requireAuth, async (req, res) => {
  try {
    const entries = await listDirectory(req.auth!);
    sendSuccess(res, entries);
  } catch (error) {
    sendError(res, error);
  }
});

usersRouter.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await listSalesUsers(req.auth!);
    sendSuccess(res, users);
  } catch (error) {
    sendError(res, error);
  }
});
