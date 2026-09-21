export type UserRole = "ADMIN" | "SALES_USER";

export type PatientStatus =
  | "NEW"
  | "PATIENT_REPLIED"
  | "REPORT_RECEIVED"
  | "TREATMENT_PLAN_SENT"
  | "IN_DISCUSSION"
  | "ACTIVE"
  | "CLOSED";

export const PATIENT_STATUSES: PatientStatus[] = [
  "NEW",
  "PATIENT_REPLIED",
  "REPORT_RECEIVED",
  "TREATMENT_PLAN_SENT",
  "IN_DISCUSSION",
  "ACTIVE",
  "CLOSED",
];

export const STATUS_LABELS: Record<PatientStatus, string> = {
  NEW: "New",
  PATIENT_REPLIED: "Patient Replied",
  REPORT_RECEIVED: "Report Received",
  TREATMENT_PLAN_SENT: "Treatment Plan Sent",
  IN_DISCUSSION: "In Discussion",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
