import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. Auth will not work. Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current Supabase session's access token synchronously from localStorage.
 * This avoids the async getSession() call for use in tRPC headers.
 */
export function getSupabaseAccessToken(): string | undefined {
  try {
    const storageKey = `sb-${extractProjectRef(supabaseUrl)}-auth-token`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    // Supabase stores [access_token, refresh_token, ...] in an array
    return parsed?.[0] ?? undefined;
  } catch {
    return undefined;
  }
}

function extractProjectRef(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
}
