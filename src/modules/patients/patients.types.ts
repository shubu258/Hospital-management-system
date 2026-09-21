import type { PatientStatus } from "../../types/database";

export { PATIENT_STATUSES, isPatientStatus } from "../../types/database";

export interface CreatePatientInput {
  name: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  medical_condition?: string | null;
  medical_description?: string | null;
  assigned_to?: string | null;
}

export interface UpdatePatientInput {
  name?: string;
  country?: string;
  phone?: string | null;
  email?: string | null;
  medical_condition?: string | null;
  medical_description?: string | null;
}

export interface ListPatientsQuery {
  search?: string;
  status?: PatientStatus;
  assignedTo?: string;
  createdBy?: string;
  page: number;
  pageSize: number;
}
