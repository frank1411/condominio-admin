import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminConfig() {
  const { data: config, isLoading, refetch } = trpc.config.get.useQuery();
  const { data: floorsData } = trpc.floors.withApartments.useQuery();
  const updateConfig = trpc.config.update.useMutation();
  const initStructure = trpc.config.initializeStructure.useMutation();

  // La estructura es inmutable una vez creada (BUG-002)
  const structureExists = (floorsData?.length ?? 0) > 0;

  const [formData, setFormData] = useState({
    name: "",
    floors: 5,
    apartmentsPerFloor: 6,
    baseFee: "0.00",
    defaultCurrency: "USD" as "USD" | "VES",
    exchangeRate: "1.0000",
    reminderDay: 5,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.name || "",
        floors: config.floors || 5,
        apartmentsPerFloor: config.apartmentsPerFloor || 6,
        baseFee: config.baseFee || "0.00",
        defaultCurrency: config.defaultCurrency || "USD",
        exchangeRate: config.exchangeRate || "1.0000",
        reminderDay: config.reminderDay || 5,
      });
    }
  }, [config]);

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Error al actualizar configuración";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Si la estructura ya existe, pisos/aptos son inmutables: no se envían
      // (evita que el guard del server rechace el update por enviar valores
      // que no se pueden cambiar — BUG-002 follow-up).
      const payload = structureExists
        ? {
            name: formData.name,
            baseFee: formData.baseFee,
            defaultCurrency: formData.defaultCurrency,
            exchangeRate: formData.exchangeRate,
            reminderDay: formData.reminderDay,
          }
        : formData;

      await updateConfig.mutateAsync(payload);
      toast.success("Configuración actualizada");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleInitStructure = async () => {
    if (!confirm("¿Crear pisos y apartamentos con la configuración actual?")) return;

    try {
      await initStructure.mutateAsync();
      toast.success("Estructura del condominio creada");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración del Condominio</h1>
        <p className="text-gray-600 mt-2">Administra la configuración general del sistema</p>
      </div>

      {/* Configuración Básica */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>Datos básicos del condominio</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nombre del Condominio</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Mi Condominio"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cantidad de Pisos</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.floors}
                  disabled={structureExists}
                  onChange={(e) =>
                    setFormData({ ...formData, floors: parseInt(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Apartamentos por Piso</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.apartmentsPerFloor}
                  disabled={structureExists}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      apartmentsPerFloor: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            {structureExists && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                ⚠️ La estructura del condominio ya fue creada y es inmutable. Los pisos y
                apartamentos actuales no se pueden modificar desde aquí; para cambiarlos se
                requiere intervención directa en la base de datos.
              </p>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Configuración de Mensualidad */}
      <Card>
        <CardHeader>
          <CardTitle>Mensualidad Base</CardTitle>
          <CardDescription>Configura el monto base de la mensualidad</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Monto Base</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.baseFee}
                  onChange={(e) => setFormData({ ...formData, baseFee: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Moneda por Defecto</Label>
                <Select
                  value={formData.defaultCurrency}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      defaultCurrency: value as "USD" | "VES",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD (Dólares)</SelectItem>
                    <SelectItem value="VES">VES (Bolívares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Configuración de Cambio */}
      <Card>
        <CardHeader>
          <CardTitle>Tasa de Cambio</CardTitle>
          <CardDescription>Configura la tasa de cambio USD a VES</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tasa de Cambio (1 USD = ? VES)</Label>
              <Input
                type="number"
                step="0.0001"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                placeholder="1.0000"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Configuración de Recordatorios */}
      <Card>
        <CardHeader>
          <CardTitle>Recordatorios Automáticos</CardTitle>
          <CardDescription>Configura el día del mes para enviar recordatorios</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Día del Mes para Recordatorios (1-28)</Label>
              <Input
                type="number"
                min="1"
                max="28"
                value={formData.reminderDay}
                onChange={(e) =>
                  setFormData({ ...formData, reminderDay: parseInt(e.target.value) })
                }
              />
            </div>
            <p className="text-sm text-gray-600">
              Los recordatorios se enviarán automáticamente el día {formData.reminderDay} de cada mes
            </p>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Inicializar Estructura — solo visible antes de crear la estructura */}
      {!structureExists && (
        <Card>
          <CardHeader>
            <CardTitle>Inicializar Estructura</CardTitle>
            <CardDescription>Crea pisos y apartamentos según la configuración</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Se crearán {formData.floors} pisos con {formData.apartmentsPerFloor} apartamentos cada uno.
            </p>
            <Button
              onClick={handleInitStructure}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Crear Estructura
            </Button>
          </CardContent>
        </Card>
      )}
      {structureExists && (
        <Card>
          <CardHeader>
            <CardTitle>Estructura del Condominio</CardTitle>
            <CardDescription>La estructura ya fue creada</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Estructura actual: {floorsData?.length ?? 0} pisos configurados.
              La estructura es inmutable una vez creada — los cambios de pisos y
              apartamentos requieren intervención directa en la base de datos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
