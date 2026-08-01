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
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminCharges() {
  const utils = trpc.useUtils();
  const { data: charges, isLoading } = trpc.charges.list.useQuery();
  const { data: apartments } = trpc.apartments.list.useQuery();
  const createCharge = trpc.charges.create.useMutation();
  const updateCharge = trpc.charges.update.useMutation();
  const deleteCharge = trpc.charges.delete.useMutation();

  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    currency: "USD" as "USD" | "VES",
    isIndividual: false,
    apartmentId: undefined as number | undefined,
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      amount: "",
      currency: "USD",
      isIndividual: false,
      apartmentId: undefined,
    });
  };

  const handleEdit = (charge: NonNullable<typeof charges>[number]) => {
    setEditingId(charge.id);
    setFormData({
      name: charge.name,
      description: charge.description || "",
      amount: parseFloat(charge.amount as unknown as string).toFixed(2),
      currency: (charge.currency as "USD" | "VES") || "USD",
      isIndividual: !!charge.apartmentId,
      apartmentId: charge.apartmentId || undefined,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const invalidateAll = () =>
    Promise.all([
      utils.charges.invalidate(),
      utils.debts.invalidate(),
      utils.reports.invalidate(),
    ]);

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
      if (editingId !== null) {
        // El alcance (individual/global/apto) es inmutable en edición
        await updateCharge.mutateAsync({
          id: editingId,
          name: formData.name,
          description: formData.description,
          amount: formData.amount,
          currency: formData.currency,
        });
        toast.success("Cobro actualizado — deudas del mes ajustadas");
      } else {
        await createCharge.mutateAsync(formData);
        toast.success("Cobro creado exitosamente");
      }
      resetForm();
      // Editar/crear un cobro cambia las deudas: invalidar todo lo derivado
      await invalidateAll();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : editingId !== null
            ? "Error al actualizar el cobro"
            : "Error al crear el cobro";
      toast.error(message);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "¿Eliminar este cobro? Se restará su monto de las deudas del mes. Si algún apartamento ya pagó, la diferencia quedará como saldo a favor del residente."
      )
    )
      return;

    try {
      await deleteCharge.mutateAsync({ id });
      toast.success("Cobro eliminado");
      await Promise.all([
        utils.charges.invalidate(),
        utils.debts.invalidate(),
        utils.reports.invalidate(),
      ]);
    } catch (error) {
      // BUG-003: mostrar el motivo real (bloqueo por deudas ya pagadas)
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Error al eliminar el cobro";
      toast.error(message);
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

      {/* Formulario de Nuevo/Editar Cobro */}
      <Card className={editingId !== null ? "border-blue-400 ring-2 ring-blue-100" : ""}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>
              {editingId !== null ? `Editando: ${formData.name || "Cobro"}` : "Crear Nuevo Cobro"}
            </CardTitle>
            <CardDescription>
              {editingId !== null
                ? "Los cambios de monto ajustarán las deudas vigentes del mes automáticamente"
                : "Agrega un nuevo cobro adicional a las mensualidades"}
            </CardDescription>
          </div>
          {editingId !== null && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancelar edición
            </Button>
          )}
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
              <label
                className={`flex items-center gap-2 mb-4 ${
                  editingId !== null ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
                title={
                  editingId !== null
                    ? "El alcance del cobro no se puede cambiar en edición. Elimina y crea un nuevo cobro si necesitas otro alcance."
                    : undefined
                }
              >
                <Checkbox
                  checked={formData.isIndividual}
                  disabled={editingId !== null}
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
                    disabled={editingId !== null}
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
              {editingId !== null ? "Guardar Cambios" : "Crear Cobro"}
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
                      onClick={() => handleEdit(charge)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Editar cobro"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
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
