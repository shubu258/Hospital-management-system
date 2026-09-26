import { ApiError } from "../../utils/http";
import { STATUS_COLORS, type StatusColor } from "../../types/database";

const STATUS_KEY_PATTERN = /^[A-Z0-9_]{1,60}$/;
const MAX_LABEL_LENGTH = 40;

// Shape check only; whether the status exists is checked against the DB.
export function isStatusKey(value: unknown): value is string {
  return typeof value === "string" && STATUS_KEY_PATTERN.test(value);
}

export function validateStatusKey(value: string): string {
  if (!isStatusKey(value)) {
    throw new ApiError(400, "Invalid status");
  }
  return value;
}

function validateLabel(value: unknown): string {
  const label = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!label) {
    throw new ApiError(400, "Status name is required");
  }
  if (label.length > MAX_LABEL_LENGTH) {
    throw new ApiError(400, `Status name must be at most ${MAX_LABEL_LENGTH} characters`);
  }
  return label;
}

function validateColor(value: unknown): StatusColor {
  if (typeof value !== "string" || !STATUS_COLORS.includes(value as StatusColor)) {
    throw new ApiError(400, `color must be one of: ${STATUS_COLORS.join(", ")}`);
  }
  return value as StatusColor;
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Invalid request body");
  }
  return body as Record<string, unknown>;
}

export function validateCreateStatus(body: unknown): { label: string; color: StatusColor } {
  const record = asRecord(body);
  return {
    label: validateLabel(record.label),
    color: record.color === undefined ? "slate" : validateColor(record.color),
  };
}

export function validateUpdateStatus(body: unknown): { label?: string; color?: StatusColor } {
  const record = asRecord(body);
  const update: { label?: string; color?: StatusColor } = {};
  if (record.label !== undefined) update.label = validateLabel(record.label);
  if (record.color !== undefined) update.color = validateColor(record.color);
  if (Object.keys(update).length === 0) {
    throw new ApiError(400, "Nothing to update");
  }
  return update;
}

export function validateReorder(body: unknown): string[] {
  const keys = asRecord(body).keys;
  if (!Array.isArray(keys) || keys.length === 0 || !keys.every(isStatusKey)) {
    throw new ApiError(400, "keys must be a list of status keys");
  }
  if (new Set(keys).size !== keys.length) {
    throw new ApiError(400, "keys must not repeat");
  }
  return keys;
}

export function validateRemoveStatus(body: unknown): string | null {
  const moveTo =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>).moveTo : undefined;
  if (moveTo === undefined || moveTo === null || moveTo === "") return null;
  if (!isStatusKey(moveTo)) {
    throw new ApiError(400, "moveTo must be a status key");
  }
  return moveTo;
}
