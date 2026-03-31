import { trpc } from "@/lib/trpc";
import { Bell, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function NotificationCenter() {
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery();
  const { data: unreadNotifications = [] } = trpc.notifications.unread.useQuery();
  const markAsRead = trpc.notifications.markAsRead.useMutation();
  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_approved":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "payment_rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "debt_created":
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case "debt_paid":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "payment_approved":
      case "debt_paid":
        return "bg-green-50 border-green-200";
      case "payment_rejected":
        return "bg-red-50 border-red-200";
      case "debt_created":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead.mutateAsync({ id: notificationId });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 max-h-96 overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificaciones</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
              >
                Marcar todo como leído
              </Button>
            )}
          </div>
        </div>

        {unreadNotifications.length > 0 ? (
          <div className="space-y-2 p-2">
            {unreadNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${getNotificationColor(
                  notification.type
                )} hover:opacity-80`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.createdAt).toLocaleString("es-ES")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-600">No hay notificaciones nuevas</p>
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsOpen(false)}>
            Ver todas las notificaciones
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
