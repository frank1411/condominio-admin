import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, DollarSign, Users } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ManualPaymentModal } from "@/components/ManualPaymentModal";

export default function AdminDashboard() {
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; apartmentId?: number; apartmentName?: string; pendingDebt?: number }>({ open: false });
  const [sortBy, setSortBy] = useState<'floor' | 'debtDesc' | 'debtAsc'>('floor');
  const { data: dashboard, isLoading, refetch } = trpc.debts.dashboard.useQuery();
  const { data: config } = trpc.config.get.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!dashboard) {
    return <div>Error cargando dashboard</div>;
  }

  const stats = [
    {
      title: "Total de Apartamentos",
      value: dashboard.summary.total,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Al Día",
      value: dashboard.summary.paid,
      icon: CheckCircle2,
      color: "bg-green-500",
    },
    {
      title: "Con Deuda",
      value: dashboard.summary.pending,
      icon: AlertCircle,
      color: "bg-red-500",
    },
    {
      title: "Total Pendiente",
      value: `$${parseFloat(String(dashboard.summary.totalPending)).toFixed(2)}`,
      icon: DollarSign,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">Mes: {dashboard.currentMonth}</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estado de Pagos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Estado de Pagos por Apartamento</CardTitle>
            <CardDescription>Mes: {dashboard.currentMonth} - Haz click en un apartamento para registrar pago manual</CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'floor' | 'debtDesc' | 'debtAsc')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="floor">Ordenar por Piso</option>
              <option value="debtDesc">Deuda Mayor a Menor</option>
              <option value="debtAsc">Deuda Menor a Mayor</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {dashboard.debts
              .sort((a, b) => {
                if (sortBy === 'debtDesc') {
                  // Mayor a Menor
                  return parseFloat(b.pendingAmount) - parseFloat(a.pendingAmount);
                } else if (sortBy === 'debtAsc') {
                  // Menor a Mayor
                  return parseFloat(a.pendingAmount) - parseFloat(b.pendingAmount);
                }
                // Por defecto, ordenar por piso
                if (a.floorId !== b.floorId) {
                  return a.floorId - b.floorId;
                }
                return a.apartmentNumber.localeCompare(b.apartmentNumber);
              })
              .map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setPaymentModal({
                  open: true,
                  apartmentId: debt.apartmentId,
                  apartmentName: debt.unitName || `Apartamento ${debt.apartmentId}`,
                  pendingDebt: parseFloat(debt.pendingAmount),
                })}
              >
                <div className="flex-1">
                  <p className="font-medium">{debt.unitName || `Apartamento ${debt.apartmentId}`}</p>
                  <p className="text-sm text-gray-600">
                    Debido: ${parseFloat(debt.totalDue).toFixed(2)} {debt.currency}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ${parseFloat(debt.pendingAmount).toFixed(2)}
                    </p>
                  </div>
                  <Badge
                    variant={debt.isPaid ? "default" : "destructive"}
                    className={debt.isPaid ? "bg-green-600" : "bg-red-600"}
                  >
                    {debt.isPaid ? "Pagado" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Información del Condominio */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Información del Condominio</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nombre</p>
              <p className="font-medium">{config.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pisos</p>
              <p className="font-medium">{config.floors}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Apartamentos por Piso</p>
              <p className="font-medium">{config.apartmentsPerFloor}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Mensualidad Base</p>
              <p className="font-medium">${parseFloat(config.baseFee || "0").toFixed(2)} {config.defaultCurrency || "USD"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tasa de Cambio</p>
              <p className="font-medium">1 USD = {parseFloat(config.exchangeRate || "1").toFixed(2)} VES</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Día de Recordatorio</p>
              <p className="font-medium">Día {config.reminderDay} de cada mes</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Pago Manual */}
      {paymentModal.apartmentId && (
        <ManualPaymentModal
          open={paymentModal.open}
          onOpenChange={(open) => setPaymentModal({ ...paymentModal, open })}
          apartmentId={paymentModal.apartmentId}
          apartmentName={paymentModal.apartmentName || ""}
          pendingDebt={paymentModal.pendingDebt || 0}
          onPaymentRecorded={() => refetch()}
        />
      )}
    </div>
  );
}
