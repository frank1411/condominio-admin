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
import { supabase } from "@/_core/supabase";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const utils = trpc.useUtils();

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

      // Ensure the session is persisted to localStorage before redirecting.
      // getSession() reads from Supabase's in-memory state, but getSupabaseAccessToken()
      // reads from localStorage. If the token hasn't been written to localStorage yet,
      // the tRPC Authorization header will be missing on the next page load.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) {
        throw new Error("No se pudo obtener la sesión después del inicio de sesión");
      }

      console.log("[login] got token:", session.access_token.slice(0, 20) + '...');

      // Distinguir visitante de "sesión válida pero cuenta sin aprobar/desactivada":
      // auth.me devuelve null en ambos casos, pero aquí la sesión de Supabase ya
      // existe. Si el server no devuelve usuario, la cuenta está pendiente de
      // aprobación o fue desactivada — mostrarlo en vez de un loop al Login.
      //
      // IMPORTANTE: consultar auth.me con el token de la sesión EN MEMORIA, no de
      // localStorage. Tras signInWithPassword, supabase-js persiste la sesión a
      // localStorage de forma asíncrona; si auth.me corre antes, el header
      // Authorization (que httpBatchLink construye desde getSupabaseAccessToken())
      // va vacío y el server responde null -> falso "cuenta no aprobada".
      // El refresh luego sí funciona porque para entonces el token ya está
      // persistido (y getSupabaseAccessToken() soporta el formato objeto de
      // supabase-js v2.110).
      let me: Awaited<ReturnType<typeof utils.auth.me.fetch>> = null;
      try {
        const res = await fetch("/api/trpc/auth.me?batch=1", {
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        const body = (await res.json()) as {
          result?: { data?: { json?: Awaited<ReturnType<typeof utils.auth.me.fetch>> } };
        };
        me = body?.result?.data?.json ?? null;
      } catch {
        me = null;
      }
      if (!me) {
        setError(
          "Tu cuenta aún no está aprobada o fue desactivada por el administrador. " +
          "Si acabas de registrarte, confirma tu correo y espera la aprobación."
        );
        setIsLoading(false);
        return;
      }

      // Full page navigation to / — this forces a full re-initialization of the app
      // so that trpc.auth.me.useQuery() mounts fresh with the Authorization header
      // containing the token from localStorage.  wouter's setLocation() is avoided
      // because it only changes the URL via history.pushState without re-mounting
      // the AuthProvider, so the stale tRPC query result (null) persists.
      console.log("[login] redirecting to /");
      window.location.href = "/";
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

            <p className="text-sm text-gray-600 text-center">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                Regístrate aquí
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
