import { and, desc, eq, sql } from "drizzle-orm";
import { notifications } from "../../drizzle/schema";
import { getDb } from "./client";

export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    return await db.insert(notifications).values(data);
  } catch (error) {
    console.error("[Notifications] Error creating notification:", error);
    return null;
  }
}

/**
 * Obtener notificaciones no leídas de un usuario
 */

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  
  try {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          drizzleEq(notifications.userId, userId),
          drizzleEq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.error("[Notifications] Error getting unread notifications:", error);
    return [];
  }
}

/**
 * Obtener todas las notificaciones de un usuario
 */

export async function getUserNotifications(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  
  try {
    return await db
      .select()
      .from(notifications)
      .where(drizzleEq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Notifications] Error getting user notifications:", error);
    return [];
  }
}

/**
 * Marcar una notificación como leída
 */

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  
  try {
    return await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(drizzleEq(notifications.id, notificationId));
  } catch (error) {
    console.error("[Notifications] Error marking notification as read:", error);
    return null;
  }
}

/**
 * Marcar todas las notificaciones de un usuario como leídas
 */

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  
  try {
    return await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          drizzleEq(notifications.userId, userId),
          drizzleEq(notifications.isRead, false)
        )
      );
  } catch (error) {
    console.error("[Notifications] Error marking all notifications as read:", error);
    return null;
  }
}

/**
 * Contar notificaciones no leídas de un usuario
 */

export async function countUnreadNotifications(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const { eq: drizzleEq, sql } = await import('drizzle-orm');
  
  try {
    const result = await db
      .select({ count: sql`COUNT(*)` })
      .from(notifications)
      .where(
        and(
          drizzleEq(notifications.userId, userId),
          drizzleEq(notifications.isRead, false)
        )
      );
    
    return parseInt(result[0]?.count as string) || 0;
  } catch (error) {
    console.error("[Notifications] Error counting unread notifications:", error);
    return 0;
  }
}

/**
 * Notificar al usuario cuando su pago es aprobado
 */

export async function notifyPaymentApproved(userId: number, paymentId: number, amount: string, currency: string) {
  return createNotification({
    userId,
    type: "payment_approved",
    title: "Pago Aprobado",
    message: `Tu pago de ${currency} ${parseFloat(amount).toFixed(2)} ha sido aprobado exitosamente.`,
    relatedEntityType: "payment",
    relatedEntityId: paymentId,
    actionUrl: `/user/payments/${paymentId}`,
  });
}

/**
 * Notificar al usuario cuando su pago es rechazado
 */

export async function notifyPaymentRejected(userId: number, paymentId: number, reason: string) {
  return createNotification({
    userId,
    type: "payment_rejected",
    title: "Pago Rechazado",
    message: `Tu pago ha sido rechazado. Razón: ${reason}`,
    relatedEntityType: "payment",
    relatedEntityId: paymentId,
    actionUrl: `/user/payments/${paymentId}`,
  });
}

/**
 * Notificar al admin cuando hay un nuevo pago pendiente
 */

export async function notifyAdminNewPayment(adminId: number, paymentId: number, apartmentName: string, amount: string, currency: string) {
  return createNotification({
    userId: adminId,
    type: "payment_received",
    title: "Nuevo Pago Pendiente de Revisión",
    message: `Se ha recibido un pago de ${currency} ${parseFloat(amount).toFixed(2)} del apartamento ${apartmentName}.`,
    relatedEntityType: "payment",
    relatedEntityId: paymentId,
    actionUrl: `/admin/payments`,
  });
}

/**
 * Notificar al usuario cuando se genera una nueva deuda
 */

export async function notifyNewDebt(userId: number, apartmentId: number, month: string, amount: string, currency: string) {
  return createNotification({
    userId,
    type: "debt_created",
    title: "Nueva Deuda Registrada",
    message: `Se ha registrado una deuda de ${currency} ${parseFloat(amount).toFixed(2)} para el mes de ${month}.`,
    relatedEntityType: "debt",
    relatedEntityId: apartmentId,
    actionUrl: `/user/debts`,
  });
}

/**
 * Notificar al usuario cuando su deuda es pagada
 */

export async function notifyDebtPaid(userId: number, apartmentId: number, month: string, amount: string, currency: string) {
  return createNotification({
    userId,
    type: "debt_paid",
    title: "Deuda Pagada",
    message: `Tu deuda de ${currency} ${parseFloat(amount).toFixed(2)} para el mes de ${month} ha sido pagada.`,
    relatedEntityType: "debt",
    relatedEntityId: apartmentId,
    actionUrl: `/user/debts`,
  });
}


// ===== FASE 4: ALMACENAMIENTO S3 =====

/**
 * Subir comprobante de pago a S3
 */
