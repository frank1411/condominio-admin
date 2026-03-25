import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPaymentReview() {
  const { data: payments, isLoading, refetch } = trpc.payments.pending.useQuery();
  const approvePayment = trpc.payments.approve.useMutation();
  const rejectPayment = trpc.payments.reject.useMutation();
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const handleApprove = async (id: number) => {
    try {
      await approvePayment.mutateAsync({ id, notes });
      toast.success("Pago aprobado");
      setNotes("");
      setSelectedPayment(null);
      refetch();
    } catch (error) {
      toast.error("Error al aprobar pago");
    }
  };

  const handleReject = async (id: number) => {
    if (!notes.trim()) {
      toast.error("Debes proporcionar una razón para rechazar");
      return;
    }

    try {
      await rejectPayment.mutateAsync({ id, notes });
      toast.success("Pago rechazado");
      setNotes("");
      setSelectedPayment(null);
      refetch();
    } catch (error) {
      toast.error("Error al rechazar pago");
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
        <h1 className="text-3xl font-bold">Revisión de Pagos</h1>
        <p className="text-gray-600 mt-2">Revisa y aprueba los pagos pendientes</p>
      </div>

      {payments && payments.length > 0 ? (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card
              key={payment.id}
              className={selectedPayment === payment.id ? "border-blue-500 border-2" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Apartamento {payment.apartmentId}</CardTitle>
                    <CardDescription>Mes: {payment.month}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50">
                    Pendiente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Monto</p>
                    <p className="font-bold">
                      {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Comprobante</p>
                    <p className="font-medium">{payment.voucherNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Enviado</p>
                    <p className="text-sm">
                      {new Date(payment.submittedAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Usuario</p>
                    <p className="text-sm">ID: {payment.userId}</p>
                  </div>
                </div>

                {payment.voucherImage && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Imagen del Comprobante</p>
                    <img
                      src={payment.voucherImage}
                      alt="Comprobante"
                      className="max-w-xs max-h-48 border rounded"
                    />
                  </div>
                )}

                {selectedPayment === payment.id && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border-2 border-blue-200">
                    <div>
                      <label className="text-sm font-medium">Notas (opcional)</label>
                      <Textarea
                        placeholder="Agrega notas sobre este pago"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(payment.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => handleReject(payment.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rechazar
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedPayment(null);
                          setNotes("");
                        }}
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {selectedPayment !== payment.id && (
                  <Button
                    onClick={() => setSelectedPayment(payment.id)}
                    variant="outline"
                    className="w-full"
                  >
                    Revisar Pago
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-600">No hay pagos pendientes de revisión</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
