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

export function isPatientStatus(value: unknown): value is PatientStatus {
  return typeof value === "string" && PATIENT_STATUSES.includes(value as PatientStatus);
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      patients: {
        Row: {
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
        };
        Insert: {
          id?: string;
          name: string;
          country: string;
          phone?: string | null;
          email?: string | null;
          medical_condition?: string | null;
          medical_description?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          status?: PatientStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "patients_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patients_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_status_history: {
        Row: {
          id: string;
          patient_id: string;
          old_status: PatientStatus | null;
          new_status: PatientStatus;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          old_status?: PatientStatus | null;
          new_status: PatientStatus;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["patient_status_history"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "patient_status_history_patient_id_fkey";
            columns: ["patient_id"];
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_status_history_changed_by_fkey";
            columns: ["changed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_documents: {
        Row: {
          id: string;
          patient_id: string;
          file_name: string;
          file_path: string;
          file_type: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          file_name: string;
          file_path: string;
          file_type: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["patient_documents"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey";
            columns: ["patient_id"];
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      team_directory: {
        Args: Record<string, never>;
        Returns: { id: string; name: string }[];
      };
    };
  };
}
