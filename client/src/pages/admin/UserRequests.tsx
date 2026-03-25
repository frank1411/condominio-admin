import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUserRequests() {
  const { data: pendingUsers, isLoading, refetch } = trpc.users.pending.useQuery();
  const { data: apartments } = trpc.apartments.list.useQuery();
  const approveUser = trpc.users.approve.useMutation();
  const rejectUser = trpc.users.reject.useMutation();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async (userId: number) => {
    try {
      await approveUser.mutateAsync({ userId });
      toast.success("Usuario aprobado");
      setSelectedUser(null);
      refetch();
    } catch (error) {
      toast.error("Error al aprobar usuario");
    }
  };

  const handleReject = async (userId: number) => {
    if (!rejectionReason.trim()) {
      toast.error("Debes proporcionar una razón para rechazar");
      return;
    }

    try {
      await rejectUser.mutateAsync({ userId, reason: rejectionReason });
      toast.success("Usuario rechazado");
      setRejectionReason("");
      setSelectedUser(null);
      refetch();
    } catch (error) {
      toast.error("Error al rechazar usuario");
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
        <h1 className="text-3xl font-bold">Solicitudes de Usuarios</h1>
        <p className="text-gray-600 mt-2">Aprueba o rechaza nuevas solicitudes de registro</p>
      </div>

      {pendingUsers && pendingUsers.length > 0 ? (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <Card
              key={user.id}
              className={selectedUser === user.id ? "border-blue-500 border-2" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{user.name || "Sin nombre"}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50">
                    Pendiente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Método de Login</p>
                    <p className="font-medium">{user.loginMethod || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registrado</p>
                    <p className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Apartamento</p>
                    <p className="font-medium">
                      {user.apartmentId
                        ? apartments?.find(a => a.id === user.apartmentId)?.unitName || `Apt. ${user.apartmentId}`
                        : "No asignado"}
                    </p>
                  </div>
                </div>

                {selectedUser === user.id && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border-2 border-blue-200">
                    <div>
                      <label className="text-sm font-medium">Razón de rechazo (si aplica)</label>
                      <Textarea
                        placeholder="Proporciona una razón si vas a rechazar esta solicitud"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(user.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => handleReject(user.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rechazar
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedUser(null);
                          setRejectionReason("");
                        }}
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {selectedUser !== user.id && (
                  <Button
                    onClick={() => setSelectedUser(user.id)}
                    variant="outline"
                    className="w-full"
                  >
                    Revisar Solicitud
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-600">No hay solicitudes pendientes de aprobación</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
