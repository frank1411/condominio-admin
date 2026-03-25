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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, voucherImage: base64 });
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      toast.error("Completa los campos requeridos");
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
      toast.error("Error al enviar pago");
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
                  accept="image/*"
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

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Enviar Pago
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
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">Mes: {payment.month}</p>
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
