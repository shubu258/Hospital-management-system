import { ApiError } from "../../utils/http";
import { isValidEmail, isValidPhone, isValidUuid } from "../../utils/validation";
import { isStatusKey } from "../statuses";
import { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from "./patients.types";
import type { PatientStatus } from "../../types/database";

const OPTIONAL_TEXT_FIELDS = [
  "phone",
  "email",
  "medical_condition",
  "medical_description",
] as const;

function normalizeOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ApiError(400, "Expected a string value");
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function validateOptionalContactFields(body: Record<string, unknown>) {
  const result: Partial<Record<(typeof OPTIONAL_TEXT_FIELDS)[number], string | null>> = {};

  for (const field of OPTIONAL_TEXT_FIELDS) {
    const normalized = normalizeOptionalText(body[field]);
    if (normalized === undefined) continue;
    result[field] = normalized;
  }

  if (result.email && !isValidEmail(result.email)) {
    throw new ApiError(400, "Invalid email format");
  }
  if (result.phone && !isValidPhone(result.phone)) {
    throw new ApiError(400, "Invalid phone format");
  }

  return result;
}

export function validateCreatePatient(body: unknown): CreatePatientInput {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Invalid request body");
  }
  const record = body as Record<string, unknown>;

  const name = typeof record.name === "string" ? record.name.trim() : "";
  const country = typeof record.country === "string" ? record.country.trim() : "";

  if (!name) {
    throw new ApiError(400, "name is required");
  }
  if (!country) {
    throw new ApiError(400, "country is required");
  }

  const optional = validateOptionalContactFields(record);

  let assignedTo: string | null | undefined;
  if (record.assigned_to !== undefined) {
    if (record.assigned_to === null) {
      assignedTo = null;
    } else if (typeof record.assigned_to === "string" && isValidUuid(record.assigned_to)) {
      assignedTo = record.assigned_to;
    } else {
      throw new ApiError(400, "assigned_to must be a valid user id");
    }
  }

  return {
    name,
    country,
    assigned_to: assignedTo,
    ...optional,
  };
}

export function validateUpdatePatient(body: unknown): UpdatePatientInput {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Invalid request body");
  }
  const record = body as Record<string, unknown>;

  const update: UpdatePatientInput = {};

  if (record.name !== undefined) {
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) {
      throw new ApiError(400, "name cannot be empty");
    }
    update.name = name;
  }

  if (record.country !== undefined) {
    const country = typeof record.country === "string" ? record.country.trim() : "";
    if (!country) {
      throw new ApiError(400, "country cannot be empty");
    }
    update.country = country;
  }

  Object.assign(update, validateOptionalContactFields(record));

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, "No valid fields to update");
  }

  return update;
}

export function validateStatusUpdate(body: unknown): PatientStatus {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Invalid request body");
  }
  const status = (body as Record<string, unknown>).status;
  if (!isStatusKey(status)) {
    throw new ApiError(400, "Invalid status value");
  }
  return status;
}

export function validateAssignInput(body: unknown): string {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Invalid request body");
  }
  const assignedTo = (body as Record<string, unknown>).assigned_to;
  if (typeof assignedTo !== "string" || !isValidUuid(assignedTo)) {
    throw new ApiError(400, "assigned_to must be a valid user id");
  }
  return assignedTo;
}

export function validateBulkAssignInput(body: unknown): {
  status: PatientStatus;
  assignedTo: string;
} {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Invalid request body");
  }
  const record = body as Record<string, unknown>;

  if (!isStatusKey(record.status)) {
    throw new ApiError(400, "A valid status is required");
  }

  const assignedTo = record.assigned_to;
  if (typeof assignedTo !== "string" || !isValidUuid(assignedTo)) {
    throw new ApiError(400, "assigned_to must be a valid user id");
  }

  return { status: record.status, assignedTo };
}

export function validatePatientId(id: string): string {
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid patient id");
  }
  return id;
}

export function validateStatusHistoryId(id: string): string {
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid status history id");
  }
  return id;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: unknown, fallback: number, max?: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, "Invalid pagination parameter");
  }
  return max ? Math.min(parsed, max) : parsed;
}

export function validateListQuery(query: Record<string, unknown>): ListPatientsQuery {
  const search =
    typeof query.search === "string" && query.search.trim() !== ""
      ? query.search.trim()
      : undefined;

  let status: PatientStatus | undefined;
  if (query.status !== undefined) {
    if (!isStatusKey(query.status)) {
      throw new ApiError(400, "Invalid status filter");
    }
    status = query.status;
  }

  let assignedTo: string | undefined;
  if (query.assigned_to !== undefined) {
    if (typeof query.assigned_to !== "string" || !isValidUuid(query.assigned_to)) {
      throw new ApiError(400, "Invalid assigned_to filter");
    }
    assignedTo = query.assigned_to;
  }

  let createdBy: string | undefined;
  if (query.created_by !== undefined) {
    if (typeof query.created_by !== "string" || !isValidUuid(query.created_by)) {
      throw new ApiError(400, "Invalid created_by filter");
    }
    createdBy = query.created_by;
  }

  const page = parsePositiveInt(query.page, 1);
  const pageSize = parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  return { search, status, assignedTo, createdBy, page, pageSize };
}
