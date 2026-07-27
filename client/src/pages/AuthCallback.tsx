import { useEffect } from "react";
import { supabase } from "@/_core/supabase";

/**
 * Auth callback page — receives the Supabase Auth redirect,
 * saves the session, and redirects back to the app.
 */
export default function AuthCallback() {
  useEffect(() => {
    const handleAuth = async () => {
      // Supabase auth automatically stores the session in localStorage
      // after the OAuth redirect. Just wait a moment and redirect to app root.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        window.location.href = "/";
      } else {
        // Try to extract the hash fragment (Supabase uses URL hash for PKCE flow)
        const hash = window.location.hash;
        if (hash) {
          // Let supabase-js handle the hash fragment
          const { error } = await supabase.auth.setSession({
            access_token: "",
            refresh_token: "",
          });
          if (!error) {
            window.location.href = "/";
            return;
          }
        }
        console.error("No session found after auth callback");
        window.location.href = "/login";
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Completando inicio de sesión...</p>
    </div>
  );
}
