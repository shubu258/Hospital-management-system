import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import { authRouter } from "./modules/auth";
import { patientsRouter } from "./modules/patients";
import { usersRouter } from "./modules/users";
import { dashboardRouter } from "./modules/dashboard";
import { ApiError, sendError } from "./utils/http";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/patients", patientsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use((_req, res) => {
    sendError(res, new ApiError(404, "Not found"));
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && "status" in err && (err as any).status === 400) {
      sendError(res, new ApiError(400, "Malformed JSON body"));
      return;
    }
    sendError(res, err);
  });

  return app;
}
