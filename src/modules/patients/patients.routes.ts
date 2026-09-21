import { Router } from "express";
import { requireAuth, requireRole } from "../auth";
import { documentsRouter } from "../documents";
import { sendError, sendSuccess } from "../../utils/http";
import {
  validateAssignInput,
  validateBulkAssignInput,
  validateCreatePatient,
  validateListQuery,
  validatePatientId,
  validateStatusHistoryId,
  validateStatusUpdate,
  validateUpdatePatient,
} from "./patients.validation";
import {
  assignPatient,
  bulkAssignByStatus,
  createPatient,
  deletePatient,
  deleteStatusHistoryEntry,
  getPatientById,
  getStatusHistory,
  listPatients,
  updatePatient,
  updatePatientStatus,
} from "./patients.service";

export const patientsRouter = Router();

patientsRouter.use(requireAuth);

patientsRouter.post("/", async (req, res) => {
  try {
    const input = validateCreatePatient(req.body);
    const patient = await createPatient(req.auth!, input);
    sendSuccess(res, patient, 201);
  } catch (error) {
    sendError(res, error);
  }
});

patientsRouter.get("/", async (req, res) => {
  try {
    const query = validateListQuery(req.query as Record<string, unknown>);
    const result = await listPatients(req.auth!, query);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error);
  }
});

// Registered before "/:id" — "assign-by-status" would otherwise be parsed as
// a patient id by that route, since Express matches routes in registration
// order and ":id" matches any single path segment.
patientsRouter.patch("/assign-by-status", requireRole("ADMIN"), async (req, res) => {
  try {
    const { status, assignedTo } = validateBulkAssignInput(req.body);
    const result = await bulkAssignByStatus(req.auth!, status, assignedTo);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error);
  }
});

patientsRouter.get("/:id", async (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const patient = await getPatientById(req.auth!, id);
    sendSuccess(res, patient);
  } catch (error) {
    sendError(res, error);
  }
});

patientsRouter.patch("/:id", async (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const input = validateUpdatePatient(req.body);
    const patient = await updatePatient(req.auth!, id, input);
    sendSuccess(res, patient);
  } catch (error) {
    sendError(res, error);
  }
});

patientsRouter.patch("/:id/status", async (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const status = validateStatusUpdate(req.body);
    const result = await updatePatientStatus(req.auth!, id, status);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error);
  }
});

patientsRouter.get("/:id/status-history", async (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const history = await getStatusHistory(req.auth!, id);
    sendSuccess(res, history);
  } catch (error) {
    sendError(res, error);
  }
});

patientsRouter.delete(
  "/:id/status-history/:historyId",
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const id = validatePatientId(req.params.id);
      const historyId = validateStatusHistoryId(req.params.historyId);
      await deleteStatusHistoryEntry(req.auth!, id, historyId);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      sendError(res, error);
    }
  }
);

patientsRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    await deletePatient(req.auth!, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    sendError(res, error);
  }
});

patientsRouter.patch("/:id/assign", requireRole("ADMIN"), async (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const assignedTo = validateAssignInput(req.body);
    const patient = await assignPatient(req.auth!, id, assignedTo);
    sendSuccess(res, patient);
  } catch (error) {
    sendError(res, error);
  }
});

patientsRouter.use("/:id/documents", documentsRouter);
