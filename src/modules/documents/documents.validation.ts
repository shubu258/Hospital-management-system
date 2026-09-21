import { ApiError } from "../../utils/http";
import { isValidUuid } from "../../utils/validation";

export function validateDocumentId(id: string): string {
  if (!isValidUuid(id)) {
    throw new ApiError(400, "Invalid document id");
  }
  return id;
}
