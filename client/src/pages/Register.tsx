import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";
import { supabase } from "@/_core/supabase";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Apartamentos disponibles (endpoint público, no requiere auth)
  const { data: apartments } = trpc.apartments.listPublic.useQuery();

  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Construir metadata: nombre + apartamento seleccionado
      const metadata: Record<string, unknown> = { full_name: name };
      if (selectedApartmentId) {
        metadata.apartmentId = Number(selectedApartmentId);
      }

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (authError) {
        throw authError;
      }

      // Con autoconfirm activo en Supabase, el usuario puede iniciar sesión
      // inmediatamente. Su cuenta queda en estado "pending" y el admin la
      // aprueba desde "Solicitudes de Registro".
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || "Error al registrarse. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleButtonClick() {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">¡Registro exitoso!</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Tu cuenta fue creada. Ahora puedes iniciar sesión. Tu cuenta
              quedará en estado "pendiente" hasta que el administrador la
              apruebe y te asigne tu apartamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                Ir a Iniciar Sesión
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
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
          <CardDescription>Crear cuenta de residente</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center mb-4">
                Regístrate para acceder a tu estado de pagos. Tu cuenta quedará
                pendiente de aprobación por el administrador.
              </p>
              <div className="space-y-2">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nombre y apellido"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="name"
                />
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
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <Select
                  value={selectedApartmentId}
                  onValueChange={setSelectedApartmentId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Apartamento (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(apartments ?? []).map((apt) => (
                      <SelectItem key={apt.id} value={apt.id.toString()}>
                        {apt.unitName || `Apartamento ${apt.apartmentNumber}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Selecciona tu apartamento si lo conoces. El administrador
                  podrá cambiarlo después.
                </p>
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
                  Creando cuenta...
                </>
              ) : (
                "Registrarme"
              )}
            </Button>

            <p className="text-sm text-gray-600 text-center">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Inicia sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
