import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Loader2 } from "lucide-react";
import { supabase, getSupabaseAccessToken } from "@/_core/supabase";
import { useLocation } from "wouter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    console.log("[login] starting...", { email });
    setIsLoading(true);
    setError(null);

    try {
      console.log("[login] calling signInWithPassword...");
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log("[login] signInWithPassword done", { hasError: !!authError, error: authError?.message });

      if (authError) {
        throw authError;
      }

      // Ensure the session is fully persisted before redirecting.
      // Without this, getSupabaseAccessToken() may return undefined because
      // Supabase hasn't finished writing the session to localStorage yet.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) {
        throw new Error("No se pudo obtener la sesión después del inicio de sesión");
      }

      console.log("[login] got token:", !!session.access_token, session.access_token.slice(0, 20) + '...');

      console.log("[login] redirecting to /");
      setLocation("/");
      console.log("[login] setLocation called");
    } catch (err: any) {
      console.log("[login] error caught:", err.message);
      setError(err.message || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      console.log("[login] finally - setting isLoading false");
      setIsLoading(false);
    }
  }

  // Ensure the form submits even if the button click doesn't trigger onSubmit
  function handleButtonClick() {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Sistema de Condominio</CardTitle>
          <CardDescription>Gestión de pagos y cobros</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center mb-4">
                Inicia sesión para acceder al sistema de administración de tu
                condominio.
              </p>
              <div className="space-y-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              disabled={isLoading}
              onClick={handleButtonClick}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
