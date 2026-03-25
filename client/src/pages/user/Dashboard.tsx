import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function UserDashboard() {
  const { data: debts, isLoading } = trpc.debts.myDebts.useQuery();
  const { data: config } = trpc.config.get.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  const totalDue = debts?.reduce((sum, d) => sum + parseFloat(d.totalDue || "0"), 0) || 0;
  const totalPending = debts?.reduce((sum, d) => sum + parseFloat(d.pendingAmount || "0"), 0) || 0;
  const paidCount = debts?.filter(d => d.isPaid).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Dashboard</h1>
        <p className="text-gray-600 mt-2">Visualiza tu estado de pagos</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debido</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de Pago</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalPending.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meses Pagados</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Deudas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Deudas</CardTitle>
          <CardDescription>Estado de pago por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {debts && debts.length > 0 ? (
              debts.map((debt) => (
                <div
                  key={debt.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">Mes: {debt.month}</p>
                    <p className="text-sm text-gray-600">
                      Deuda: ${parseFloat(debt.totalDue || "0").toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Total: ${parseFloat(debt.totalDue || "0").toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Pagado: ${parseFloat(debt.totalPaid || "0").toFixed(2)}
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
              ))
            ) : (
              <p className="text-center text-gray-600 py-8">No hay registros de deudas</p>
            )}
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
              <p className="text-sm text-gray-600">Mensualidad Base</p>
              <p className="font-medium">${parseFloat(config.baseFee || "0").toFixed(2)} {config.defaultCurrency || "USD"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Moneda</p>
              <p className="font-medium">{config.defaultCurrency}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Día de Recordatorio</p>
              <p className="font-medium">Día {config.reminderDay} de cada mes</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
