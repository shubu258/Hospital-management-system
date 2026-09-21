const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// Escapes ILIKE wildcard characters so free-text search input can't inject
// unintended pattern matches.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
