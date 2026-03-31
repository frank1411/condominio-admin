import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { TableLoadingSkeleton } from "@/components/LoadingSkeleton";

export default function NotificationHistory() {
  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery({});
  const markAsRead = trpc.notifications.markAsRead.useMutation();
  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead.mutateAsync({ id });
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Error al marcar como leído");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
      refetch();
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error: any) {
      toast.error(error?.message || "Error al marcar todas como leídas");
    }
  };

  const filteredNotifications = notifications?.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  }) || [];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_approved":
        return "✓";
      case "payment_rejected":
        return "✗";
      case "debt_reminder":
        return "⚠";
      default:
        return "•";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "payment_approved":
        return "bg-green-100 text-green-800";
      case "payment_rejected":
        return "bg-red-100 text-red-800";
      case "debt_reminder":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historial de Notificaciones</h1>
          <p className="text-gray-600 mt-2">
            {filteredNotifications.length} notificación{filteredNotifications.length !== 1 ? "es" : ""}
          </p>
        </div>
        <Button
          onClick={handleMarkAllAsRead}
          variant="outline"
          size="sm"
          disabled={filteredNotifications.length === 0}
        >
          <Check className="h-4 w-4 mr-2" />
          Marcar todo como leído
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(["all", "unread", "read"] as const).map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            variant={filter === f ? "default" : "outline"}
            size="sm"
          >
            {f === "all" ? "Todas" : f === "unread" ? "Sin leer" : "Leídas"}
          </Button>
        ))}
      </div>

      {/* Notificaciones */}
      {isLoading ? (
        <TableLoadingSkeleton rows={5} />
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.isRead ? "opacity-60" : "border-blue-300"}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${getNotificationColor(
                      notification.type
                    )}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{notification.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      </div>
                      <Badge variant={notification.isRead ? "secondary" : "default"}>
                        {notification.isRead ? "Leído" : "Sin leer"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                      {!notification.isRead && (
                        <Button
                          onClick={() => handleMarkAsRead(notification.id)}
                          variant="ghost"
                          size="sm"
                          disabled={markAsRead.isPending}
                        >
                          Marcar como leído
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay notificaciones</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
