import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function UserPayments() {
  const { data: payments, isLoading, refetch } = trpc.payments.myPayments.useQuery();
  const submitPayment = trpc.payments.submit.useMutation();
  const { data: myDebts } = trpc.debts.myDebts.useQuery();

  // Deuda pendiente total del apartamento (tope máximo de pago)
  const pendingDebt =
    (myDebts ?? []).reduce(
      (sum: number, debt: { pendingAmount: string | null }) =>
        sum + (parseFloat(debt.pendingAmount || "0") || 0),
      0
    ) || 0;

  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    voucherNumber: "",
    amount: "",
    currency: "USD" as "USD" | "VES",
    voucherImage: "",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // STO-02/03: validación JS — tipo MIME permitido + tamaño ≤ 5MB
    // (espejo de la validación server-side; el server sigue siendo la fuente de verdad)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Tipo de archivo no permitido: ${file.type || "desconocido"}. Usa JPG, PNG, WEBP o PDF.`);
      e.target.value = "";
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(`Archivo muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData({ ...formData, voucherImage: base64 });
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // EDG-03: guard anti doble-submit (el botón también se deshabilita)
    if (submitPayment.isPending) return;
    if (!formData.month || !formData.amount) {
      toast.error("Completa los campos requeridos");
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("El monto debe ser un número positivo mayor a cero");
      return;
    }

    // Regla de negocio: no se puede pagar más de la deuda pendiente total
    if (amountNum > pendingDebt + 0.005) {
      toast.error(
        `El monto (${amountNum.toFixed(2)}) excede tu deuda pendiente (${pendingDebt.toFixed(2)}). Solo puedes pagar hasta lo que debes.`
      );
      return;
    }

    try {
      await submitPayment.mutateAsync(formData);
      toast.success("Pago enviado para revisión");
      setFormData({
        month: new Date().toISOString().slice(0, 7),
        voucherNumber: "",
        amount: "",
        currency: "USD",
        voucherImage: "",
      });
      setImagePreview(null);
      refetch();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Error al enviar pago";
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
        <h1 className="text-3xl font-bold">Mis Pagos</h1>
        <p className="text-gray-600 mt-2">Carga y gestiona tus pagos</p>
      </div>

      {/* Formulario de Carga de Pago */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar Nuevo Pago</CardTitle>
          <CardDescription>Sube tu comprobante de pago para revisión</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Mes *</Label>
                <Input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                />
              </div>
              <div>
                <Label>Monto Pagado *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={pendingDebt > 0 ? pendingDebt : undefined}
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deuda pendiente: {pendingDebt.toFixed(2)} — no puedes pagar más de lo que debes
                </p>
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
              <div>
                <Label>Número de Comprobante</Label>
                <Input
                  placeholder="Ej: 12345678"
                  value={formData.voucherNumber}
                  onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Imagen del Comprobante</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-input"
                />
                <label htmlFor="image-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Haz clic para seleccionar una imagen
                  </p>
                </label>
              </div>
              {imagePreview && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Vista previa:</p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-xs max-h-48 border rounded"
                  />
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={submitPayment.isPending}
            >
              {submitPayment.isPending ? "Enviando..." : "Enviar Pago"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historial de Pagos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>Tus pagos enviados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {payments && payments.length > 0 ? (
              payments.slice(0, 12).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{payment.unitName || `Apartamento ${payment.apartmentId}`}</p>
                    <p className="text-sm text-gray-600">Mes: {payment.month}</p>
                    <p className="text-sm text-gray-600">
                      Monto: {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                    </p>
                    {payment.voucherNumber && (
                      <p className="text-sm text-gray-600">
                        Comprobante: {payment.voucherNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(payment.createdAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        payment.status === "approved"
                          ? "default"
                          : payment.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className={
                        payment.status === "approved"
                          ? "bg-green-600"
                          : payment.status === "rejected"
                            ? "bg-red-600"
                            : ""
                      }
                    >
                      {payment.status === "pending"
                        ? "Pendiente"
                        : payment.status === "approved"
                          ? "Aprobado"
                          : "Rechazado"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600 py-8">No hay pagos registrados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
