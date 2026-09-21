import { NextFunction, Request, Response, Router } from "express";
import multer, { MulterError } from "multer";
import { ApiError, sendError, sendSuccess } from "../../utils/http";
import { validatePatientId } from "../patients/patients.validation";
import { validateDocumentId } from "./documents.validation";
import { MAX_DOCUMENT_SIZE_BYTES } from "./documents.constants";
import { deleteDocument, listDocuments, uploadDocument } from "./documents.service";

export const documentsRouter = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
});

function uploadSingleFile(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
      sendError(
        res,
        new ApiError(400, `File exceeds the ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB limit`)
      );
      return;
    }
    if (err) {
      sendError(res, new ApiError(400, (err as Error).message));
      return;
    }
    next();
  });
}

documentsRouter.get("/", async (req: Request<{ id: string }>, res) => {
  try {
    const patientId = validatePatientId(req.params.id);
    const documents = await listDocuments(req.auth!, patientId);
    sendSuccess(res, documents);
  } catch (error) {
    sendError(res, error);
  }
});

documentsRouter.post("/", uploadSingleFile, async (req: Request<{ id: string }>, res) => {
  try {
    const patientId = validatePatientId(req.params.id);
    if (!req.file) {
      throw new ApiError(400, "file is required");
    }
    const document = await uploadDocument(req.auth!, patientId, req.file);
    sendSuccess(res, document, 201);
  } catch (error) {
    sendError(res, error);
  }
});

documentsRouter.delete(
  "/:documentId",
  async (req: Request<{ id: string; documentId: string }>, res) => {
    try {
      const patientId = validatePatientId(req.params.id);
      const documentId = validateDocumentId(req.params.documentId);
      await deleteDocument(req.auth!, patientId, documentId);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      sendError(res, error);
    }
  }
);
