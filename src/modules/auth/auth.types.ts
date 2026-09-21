import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthContext {
  userId: string;
  email: string | undefined;
  profile: Profile;
  accessToken: string;
  supabase: SupabaseClient<Database>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
