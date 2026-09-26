import { Router } from "express";
import { requireAuth, requireRole } from "../auth";
import { ApiError, sendError, sendSuccess } from "../../utils/http";
import { isValidUuid } from "../../utils/validation";
import { listDirectory, listSalesUsers, removeMember, restoreMember } from "./users.service";

export const usersRouter = Router();

function validateUserId(id: string): string {
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid user id");
  }
  return id;
}

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

// ?include=removed also returns removed members (for the Team page).
usersRouter.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await listSalesUsers(req.auth!, req.query.include === "removed");
    sendSuccess(res, users);
  } catch (error) {
    sendError(res, error);
  }
});

// Body: { reassign_to?: string | null } — who takes over their patients.
usersRouter.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = validateUserId(req.params.id);
    const reassignTo = req.body?.reassign_to;
    if (reassignTo != null && (typeof reassignTo !== "string" || !isValidUuid(reassignTo))) {
      throw new ApiError(400, "reassign_to must be a valid user id");
    }
    const result = await removeMember(req.auth!, id, reassignTo ?? null);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error);
  }
});

usersRouter.post("/:id/restore", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = validateUserId(req.params.id);
    await restoreMember(req.auth!, id);
    sendSuccess(res, { restored: true });
  } catch (error) {
    sendError(res, error);
  }
});
