import { Router } from "express";
import { requireAuth, requireRole } from "../auth";
import { sendError, sendSuccess } from "../../utils/http";
import { getAdminDashboard, getMyDashboard, getSalesAnalytics } from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const data = await getAdminDashboard(req.auth!);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, error);
  }
});

dashboardRouter.get("/analytics", requireRole("ADMIN"), async (req, res) => {
  try {
    const data = await getSalesAnalytics(req.auth!);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, error);
  }
});

dashboardRouter.get("/my", async (req, res) => {
  try {
    const data = await getMyDashboard(req.auth!);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, error);
  }
});
