import { randomUUID } from "node:crypto";
import { ApiError } from "../../utils/http";
import { getPatientById } from "../patients/patients.service";
import type { AuthContext } from "../auth";
import type { Database } from "../../types/database";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  PATIENT_DOCUMENTS_BUCKET,
  SIGNED_URL_EXPIRY_SECONDS,
} from "./documents.constants";

type PatientDocument = Database["public"]["Tables"]["patient_documents"]["Row"];
type PatientDocumentWithUrl = PatientDocument & { url: string | null };

export async function listDocuments(
  auth: AuthContext,
  patientId: string
): Promise<PatientDocumentWithUrl[]> {
  await getPatientById(auth, patientId);

  const { data, error } = await auth.supabase
    .from("patient_documents")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(400, error.message);

  const documents = data ?? [];
  return Promise.all(
    documents.map(async (doc) => {
      const { data: signed } = await auth.supabase.storage
        .from(PATIENT_DOCUMENTS_BUCKET)
        .createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY_SECONDS);
      return { ...doc, url: signed?.signedUrl ?? null };
    })
  );
}

export async function uploadDocument(
  auth: AuthContext,
  patientId: string,
  file: Express.Multer.File
): Promise<PatientDocument> {
  await getPatientById(auth, patientId);

  const extension = ALLOWED_DOCUMENT_MIME_TYPES[file.mimetype];
  if (!extension) {
    throw new ApiError(400, "Unsupported file type. Allowed types: PDF, JPG, JPEG, PNG");
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new ApiError(
      400,
      `File exceeds the ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB limit`
    );
  }

  const filePath = `${patientId}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await auth.supabase.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });

  if (uploadError) {
    throw new ApiError(400, uploadError.message);
  }

  const { data, error } = await auth.supabase
    .from("patient_documents")
    .insert({
      patient_id: patientId,
      file_name: file.originalname,
      file_path: filePath,
      file_type: file.mimetype,
      uploaded_by: auth.userId,
    })
    .select("*")
    .single();

  if (error) {
    await auth.supabase.storage.from(PATIENT_DOCUMENTS_BUCKET).remove([filePath]);
    throw new ApiError(400, error.message);
  }

  return data;
}

export async function deleteDocument(
  auth: AuthContext,
  patientId: string,
  documentId: string
): Promise<void> {
  await getPatientById(auth, patientId);

  const { data: doc, error: fetchError } = await auth.supabase
    .from("patient_documents")
    .select("*")
    .eq("id", documentId)
    .eq("patient_id", patientId)
    .maybeSingle();

  if (fetchError) throw new ApiError(400, fetchError.message);
  if (!doc) throw new ApiError(404, "Document not found");

  const { error: storageError } = await auth.supabase.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .remove([doc.file_path]);

  if (storageError) {
    throw new ApiError(400, storageError.message);
  }

  const { error: deleteError } = await auth.supabase
    .from("patient_documents")
    .delete()
    .eq("id", documentId);

  if (deleteError) throw new ApiError(400, deleteError.message);
}
