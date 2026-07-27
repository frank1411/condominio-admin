export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate Supabase Auth login URL at runtime
export const getLoginUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const redirectTo = `${window.location.origin}/auth/callback`;

  if (!supabaseUrl) {
    // Fallback for development: redirect to login page
    return "/login";
  }

  // Redirect to Supabase Auth UI
  const url = new URL(`${supabaseUrl}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
};
