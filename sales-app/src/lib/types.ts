export type UserRole = "ADMIN" | "SALES_USER";

// A status key, e.g. "IN_DISCUSSION". Statuses are managed by admins, so the
// valid keys (and their names and order) come from /api/statuses at runtime.
export type PatientStatus = string;

export const STATUS_COLORS = [
  "slate",
  "blue",
  "sky",
  "indigo",
  "violet",
  "pink",
  "rose",
  "amber",
  "orange",
  "green",
  "teal",
] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

export interface PatientStatusDef {
  key: PatientStatus;
  label: string;
  color: StatusColor;
  position: number;
  // Set once an admin removes the status. Kept so old history still shows
  // its name; nothing can be moved into it anymore.
  archived_at: string | null;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  removed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  name: string;
  country: string;
  phone: string | null;
  email: string | null;
  medical_condition: string | null;
  medical_description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  status: PatientStatus;
  created_at: string;
  updated_at: string;
}

export interface DirectoryEntry {
  id: string;
  name: string;
}

export interface StatusHistoryEntry {
  id: string;
  patient_id: string;
  old_status: PatientStatus | null;
  new_status: PatientStatus;
  changed_by: string | null;
  created_at: string;
}

export interface PatientDocument {
  id: string;
  patient_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by: string | null;
  created_at: string;
  url: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface PatientListResult {
  patients: Patient[];
  pagination: Pagination;
}

export interface AdminDashboard {
  totalPatients: number;
  statusCounts: Record<PatientStatus, number>;
  byUser: {
    userId: string | null;
    name: string;
    count: number;
    statusCounts: Record<PatientStatus, number>;
  }[];
  addedByUser: {
    userId: string;
    name: string;
    count: number;
  }[];
}

export interface MyDashboard {
  totalPatients: number;
  statusCounts: Record<PatientStatus, number>;
}

export interface SalesAnalytics {
  weeks: string[];
  newPatients: number[];
  activePatients: number[];
  closedPatients: number[];
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
