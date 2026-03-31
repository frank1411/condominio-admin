import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AdvancedTable, Column } from "@/components/AdvancedTable";

interface PaymentRow {
  id: number;
  unitName: string | null;
  month: string;
  amount: string;
  currency: string | null;
  voucherNumber: string | null;
  createdAt: Date;
  userId: number;
  apartmentId: number;
  voucherImage?: string | null;
  status?: string | null;
  updatedAt?: Date;
}

export default function AdminPaymentReview() {
  const { data: payments, isLoading, refetch } = trpc.payments.pending.useQuery();
  const approvePayment = trpc.payments.approve.useMutation();
  const rejectPayment = trpc.payments.reject.useMutation();
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const handleApprove = async (id: number) => {
    try {
      await approvePayment.mutateAsync({ id, notes });
      toast.success("Pago aprobado exitosamente");
      setNotes("");
      setSelectedPayment(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Error al aprobar pago");
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

  const tableData: PaymentRow[] = useMemo(() => {
    return (payments || []).map((p) => ({
      ...p,
      createdAt: new Date(p.createdAt),
    }));
  }, [payments]);

  const columns: Column<PaymentRow>[] = [
    {
      key: "unitName",
      label: "Apartamento",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "month",
      label: "Mes",
      sortable: true,
      filterable: true,
    },
    {
      key: "amount",
      label: "Monto",
      sortable: true,
      render: (value, row) => `${row.currency} ${parseFloat(value).toFixed(2)}`,
    },
    {
      key: "voucherNumber",
      label: "Comprobante",
      sortable: true,
    },
    {
      key: "createdAt",
      label: "Enviado",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString("es-ES"),
    },
    {
      key: "userId",
      label: "Usuario ID",
      sortable: true,
    },
    {
      key: "id",
      label: "Acciones",
      render: (value) => (
        <Button
          onClick={() => setSelectedPayment(value)}
          variant="outline"
          size="sm"
          className={selectedPayment === value ? "bg-blue-100" : ""}
        >
          {selectedPayment === value ? "Seleccionado" : "Revisar"}
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  const selectedPaymentData = payments?.find((p) => p.id === selectedPayment);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revisión de Pagos</h1>
          <p className="text-gray-600 mt-2">
            {payments?.length || 0} pago{(payments?.length || 0) !== 1 ? "s" : ""} pendiente
            {(payments?.length || 0) !== 1 ? "s" : ""} de revisión
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setViewMode("table")}
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
          >
            Tabla
          </Button>
          <Button
            onClick={() => setViewMode("cards")}
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
          >
            Tarjetas
          </Button>
        </div>
      </div>

      {payments && payments.length > 0 ? (
        <div className="space-y-6">
          {/* Vista de Tabla */}
          {viewMode === "table" && (
            <AdvancedTable
              data={tableData}
              columns={columns}
              itemsPerPage={10}
              title="Pagos Pendientes"
              description="Revisa y aprueba los pagos cargados por los residentes"
            />
          )}

          {/* Vista de Tarjetas */}
          {viewMode === "cards" && (
            <div className="space-y-4">
              {payments.map((payment) => (
                <Card
                  key={payment.id}
                  className={selectedPayment === payment.id ? "border-blue-500 border-2" : ""}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{payment.unitName || `Apartamento ${payment.apartmentId}`}</CardTitle>
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
                          {new Date(payment.createdAt).toLocaleDateString("es-ES")}
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
                            disabled={approvePayment.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {approvePayment.isPending ? "Aprobando..." : "Aprobar"}
                          </Button>
                          <Button
                            onClick={() => handleReject(payment.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            disabled={rejectPayment.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {rejectPayment.isPending ? "Rechazando..." : "Rechazar"}
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
          )}

          {/* Panel de Detalles del Pago Seleccionado */}
          {selectedPaymentData && (
            <Card className="border-blue-300 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Detalles del Pago Seleccionado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Apartamento</p>
                    <p className="font-bold">{selectedPaymentData.unitName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mes</p>
                    <p className="font-bold">{selectedPaymentData.month}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monto</p>
                    <p className="font-bold">
                      {selectedPaymentData.currency} {parseFloat(selectedPaymentData.amount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Comprobante</p>
                    <p className="font-bold">{selectedPaymentData.voucherNumber}</p>
                  </div>
                </div>

                {selectedPaymentData.voucherImage && (
                  <div>
                    <p className="text-sm font-medium mb-2">Comprobante</p>
                    <img
                      src={selectedPaymentData.voucherImage}
                      alt="Comprobante"
                      className="max-w-md max-h-64 border rounded"
                    />
                  </div>
                )}

                <div className="space-y-3 p-4 bg-white rounded-lg border">
                  <label className="text-sm font-medium">Notas (opcional)</label>
                  <Textarea
                    placeholder="Agrega notas sobre este pago"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(selectedPaymentData.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={approvePayment.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {approvePayment.isPending ? "Aprobando..." : "Aprobar"}
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedPaymentData.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      disabled={rejectPayment.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {rejectPayment.isPending ? "Rechazando..." : "Rechazar"}
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
              </CardContent>
            </Card>
          )}
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
