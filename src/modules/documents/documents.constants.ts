export const PATIENT_DOCUMENTS_BUCKET = "patient-documents";

export const ALLOWED_DOCUMENT_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const SIGNED_URL_EXPIRY_SECONDS = 300;
