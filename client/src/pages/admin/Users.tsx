import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: apartments } = trpc.apartments.list.useQuery();
  const assignApartment = trpc.users.assignApartment.useMutation();
  const updateRole = trpc.users.updateRole.useMutation();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const handleAssignApartment = async (userId: number, apartmentId: number) => {
    try {
      await assignApartment.mutateAsync({ userId, apartmentId });
      toast.success("Apartamento asignado");
      refetch();
    } catch (error) {
      toast.error("Error al asignar apartamento");
    }
  };

  const handleUpdateRole = async (userId: number, role: "admin" | "user") => {
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success("Rol actualizado");
      refetch();
    } catch (error) {
      toast.error("Error al actualizar rol");
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
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <p className="text-gray-600 mt-2">Administra los usuarios del condominio</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>Total: {users?.length || 0} usuarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {users && users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{user.name || "Sin nombre"}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Rol */}
                    <Select
                      value={user.role}
                      onValueChange={(value) =>
                        handleUpdateRole(user.id, value as "admin" | "user")
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Apartamento */}
                    <Select
                      value={user.apartmentId?.toString() || ""}
                      onValueChange={(value) =>
                        handleAssignApartment(user.id, parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Asignar apartamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {apartments?.map((apt) => (
                          <SelectItem key={apt.id} value={apt.id.toString()}>
                            Apt. {apt.apartmentNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "Admin" : "Usuario"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600 py-8">No hay usuarios registrados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
