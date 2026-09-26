import { Router } from "express";
import { requireAuth, requireRole } from "../auth";
import { sendError, sendSuccess } from "../../utils/http";
import {
  validateCreateStatus,
  validateRemoveStatus,
  validateReorder,
  validateStatusKey,
  validateUpdateStatus,
} from "./statuses.validation";
import {
  createStatus,
  listStatuses,
  removeStatus,
  reorderStatuses,
  updateStatus,
} from "./statuses.service";

export const statusesRouter = Router();

statusesRouter.use(requireAuth);

// Every signed-in user needs the list to render badges, filters and the
// pipeline. Changing it is admin-only, here and in RLS.
statusesRouter.get("/", async (req, res) => {
  try {
    sendSuccess(res, await listStatuses(req.auth!));
  } catch (error) {
    sendError(res, error);
  }
});

statusesRouter.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const input = validateCreateStatus(req.body);
    sendSuccess(res, await createStatus(req.auth!, input), 201);
  } catch (error) {
    sendError(res, error);
  }
});

// Registered before "/:key" so "order" isn't read as a status key.
statusesRouter.put("/order", requireRole("ADMIN"), async (req, res) => {
  try {
    const keys = validateReorder(req.body);
    await reorderStatuses(req.auth!, keys);
    sendSuccess(res, await listStatuses(req.auth!));
  } catch (error) {
    sendError(res, error);
  }
});

statusesRouter.patch("/:key", requireRole("ADMIN"), async (req, res) => {
  try {
    const key = validateStatusKey(req.params.key);
    const input = validateUpdateStatus(req.body);
    sendSuccess(res, await updateStatus(req.auth!, key, input));
  } catch (error) {
    sendError(res, error);
  }
});

// Body: { moveTo?: string } — required when patients are in this status.
statusesRouter.delete("/:key", requireRole("ADMIN"), async (req, res) => {
  try {
    const key = validateStatusKey(req.params.key);
    const moveTo = validateRemoveStatus(req.body);
    sendSuccess(res, await removeStatus(req.auth!, key, moveTo));
  } catch (error) {
    sendError(res, error);
  }
});
