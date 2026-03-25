import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Building2 } from "lucide-react";

export default function Login() {
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
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Inicia sesión para acceder al sistema de administración de tu condominio.
          </p>
          <Button 
            onClick={() => window.location.href = getLoginUrl()}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            Iniciar Sesión
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Usa tus credenciales de Manus para acceder
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
