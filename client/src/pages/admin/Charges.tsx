import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminCharges() {
  const utils = trpc.useUtils();
  const { data: charges, isLoading } = trpc.charges.list.useQuery();
  const { data: apartments } = trpc.apartments.list.useQuery();
  const createCharge = trpc.charges.create.useMutation();
  const deleteCharge = trpc.charges.delete.useMutation();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    currency: "USD" as "USD" | "VES",
    isIndividual: false,
    apartmentId: undefined as number | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) {
      toast.error("Completa los campos requeridos");
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("El monto debe ser un número positivo mayor a cero");
      return;
    }

    try {
      await createCharge.mutateAsync(formData);
      toast.success("Cobro creado exitosamente");
      setFormData({
        name: "",
        description: "",
        amount: "",
        currency: "USD",
        isIndividual: false,
        apartmentId: undefined,
      });
      // Crear un cobro genera deudas nuevas: invalidar todo lo derivado
      await Promise.all([
        utils.charges.invalidate(),
        utils.debts.invalidate(),
        utils.reports.invalidate(),
      ]);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Error al crear el cobro";
      toast.error(message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este cobro?")) return;

    try {
      await deleteCharge.mutateAsync({ id });
      toast.success("Cobro eliminado");
      await Promise.all([
        utils.charges.invalidate(),
        utils.debts.invalidate(),
        utils.reports.invalidate(),
      ]);
    } catch (error) {
      toast.error("Error al eliminar el cobro");
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
        <h1 className="text-3xl font-bold">Gestión de Cobros</h1>
        <p className="text-gray-600 mt-2">Administra los cobros adicionales del condominio</p>
      </div>

      {/* Formulario de Nuevo Cobro */}
      <Card>
        <CardHeader>
          <CardTitle>Crear Nuevo Cobro</CardTitle>
          <CardDescription>Agrega un nuevo cobro adicional a las mensualidades</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre del Cobro *</Label>
                <Input
                  placeholder="Ej: Agua, Electricidad, Mantenimiento"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value as "USD" | "VES" })
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

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <Checkbox
                  checked={formData.isIndividual}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isIndividual: checked as boolean, apartmentId: undefined })
                  }
                />
                <span className="font-medium">Cobro individual (solo para un apartamento)</span>
              </label>

              {formData.isIndividual && (
                <div>
                  <Label>Seleccionar Apartamento</Label>
                  <Select
                    value={formData.apartmentId?.toString() || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, apartmentId: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un apartamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {apartments?.map((apt) => (
                        <SelectItem key={apt.id} value={apt.id.toString()}>
                          {apt.unitName || `Apt. ${apt.apartmentNumber}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                placeholder="Descripción opcional del cobro"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Crear Cobro
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Cobros */}
      <Card>
        <CardHeader>
          <CardTitle>Cobros Activos</CardTitle>
          <CardDescription>Total: {charges?.length || 0} cobros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {charges && charges.length > 0 ? (
              charges.map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{charge.name}</p>
                      {charge.apartmentId && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Individual</span>
                      )}
                    </div>
                    {charge.description && (
                      <p className="text-sm text-gray-600">{charge.description}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {charge.currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {charge.currency} {parseFloat(charge.amount).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(charge.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600 py-8">No hay cobros registrados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
