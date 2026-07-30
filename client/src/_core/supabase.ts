import { createClient, type Session } from "@supabase/supabase-js";
import { COOKIE_NAME } from "@/const";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. Auth will not work. Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Sync the Supabase session token to an httpOnly cookie via the server.
 * Called on login, token refresh, and page load.
 */
async function syncSessionCookie(session: Session | null) {
  if (!session?.access_token) {
    // Clear the cookie on logout via existing auth.logout mutation
    try {
      await fetch("/api/trpc/auth.logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(null),
        credentials: "include",
      });
    } catch { /* ignore */ }
    return;
  }
  try {
    await fetch("/api/trpc/auth.setSessionCookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: session.access_token }),
      credentials: "include",
    });
  } catch { /* ignore — cookie will be set on next auth event */ }
}

/**
 * Initialize the auth state listener that syncs the httpOnly cookie
 * whenever Supabase auth state changes (login, token refresh, logout).
 * Call this once at app startup.
 */
export function initSessionCookieSync(): void {
  // Sync on mount (restored session from localStorage)
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      syncSessionCookie(data.session);
    }
  });

  // Sync on every auth state change (login, refresh, logout)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      syncSessionCookie(null);
    } else if (session) {
      syncSessionCookie(session);
    }
  });
}

/**
 * Get the current Supabase session's access token synchronously from localStorage.
 * Only used as fallback on first load before the cookie is synced.
 */
export function getSupabaseAccessToken(): string | undefined {
  try {
    const storageKey = `sb-${extractProjectRef(supabaseUrl)}-auth-token`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
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
