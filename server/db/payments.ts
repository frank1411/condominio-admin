import { and, desc, eq, sql } from "drizzle-orm";
import { createLogger } from "../_core/logger";

const log = createLogger("payments");
import { TRPCError } from "@trpc/server";
import { apartments, auditLog, monthlyDebts, payments } from "../../drizzle/schema";
import { getDb } from "./client";
import { createNotification } from "./notifications";
import { getUserById } from "./users";

export async function createPayment(data: typeof payments.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(payments).values(data);
  return result;
}

export async function getPaymentsByApartment(apartmentId: number, month?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const { eq: drizzleEq, and: drizzleAnd } = await import('drizzle-orm');
  let query = db
    .select({
      id: payments.id,
      userId: payments.userId,
      apartmentId: payments.apartmentId,
      unitName: apartments.unitName,
      month: payments.month,
      voucherNumber: payments.voucherNumber,
      voucherImage: payments.voucherImage,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
    })
    .from(payments)
    .innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id))
    .where(drizzleEq(payments.apartmentId, apartmentId));
  
  if (month) {
    query = db
      .select({
        id: payments.id,
        userId: payments.userId,
        apartmentId: payments.apartmentId,
        unitName: apartments.unitName,
        month: payments.month,
        voucherNumber: payments.voucherNumber,
        voucherImage: payments.voucherImage,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id))
      .where(drizzleAnd(drizzleEq(payments.apartmentId, apartmentId), drizzleEq(payments.month, month)));
  }
  
  return await query;
}

export async function getPendingPayments(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { eq: drizzleEq, desc } = await import('drizzle-orm');
  
  try {
    const data = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        apartmentId: payments.apartmentId,
        unitName: apartments.unitName,
        month: payments.month,
        voucherNumber: payments.voucherNumber,
        voucherImage: payments.voucherImage,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id))
      .where(drizzleEq(payments.status, "pending"))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
    
    return { data, total: data.length };
  } catch (error) {
    log.error("[Payments] Error fetching pending payments:", error);
    return { data: [], total: 0 };
  }
}

export async function updatePaymentStatus(id: number, status: "approved" | "rejected", reviewedBy: number, notes?: string) {
  const db = await getDb();
  if (!db) return null;
  
  const data: any = {
    status,
    reviewedAt: new Date(),
    reviewedBy,
  };
  
  if (notes) {
    data.notes = notes;
  }
  
  return await db.update(payments).set(data).where(eq(payments.id, id));
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  const result = await db
    .select()
    .from(payments)
    .where(drizzleEq(payments.id, id));
  
  return result.length > 0 ? result[0] : null;
}

export async function applyPaymentToDebts(
  apartmentId: number,
  paymentAmount: number,
  tx?: any
) {
  const db = tx ?? await getDb();
  if (!db) return null;
  
  const { eq: drizzleEq, and } = await import('drizzle-orm');
  
  try {
    // Buscar deudas pendientes del apartamento (ordenadas por mes más antiguo primero)
    const pendingDebts = await db
      .select()
      .from(monthlyDebts)
      .where(and(
        drizzleEq(monthlyDebts.apartmentId, apartmentId),
        drizzleEq(monthlyDebts.isPaid, false)
      ))
      .orderBy(monthlyDebts.month);
    
    let remainingPayment = paymentAmount;
    let appliedTotal = 0;
    
    for (const debt of pendingDebts) {
      if (remainingPayment <= 0) break;
      
      const debtAmount = parseFloat(debt.pendingAmount as unknown as string);
      const currentPaid = parseFloat(debt.totalPaid as unknown as string) || 0;
      
      if (remainingPayment >= debtAmount) {
        // El pago cubre completamente esta deuda
        remainingPayment -= debtAmount;
        appliedTotal += debtAmount;
        
        await db.update(monthlyDebts)
          .set({
            pendingAmount: "0.00",
            totalPaid: debt.totalDue,
            isPaid: true,
          })
          .where(drizzleEq(monthlyDebts.id, debt.id));
      } else if (remainingPayment > 0) {
        // El pago es parcial
        const newPending = (debtAmount - remainingPayment).toFixed(2);
        const newPaid = (currentPaid + remainingPayment).toFixed(2);
        
        appliedTotal += remainingPayment;
        
        await db.update(monthlyDebts)
          .set({
            pendingAmount: newPending,
            totalPaid: newPaid,
          })
          .where(drizzleEq(monthlyDebts.id, debt.id));
        
        remainingPayment = 0;
      }
    }
    
    return { success: true, appliedAmount: appliedTotal };
  } catch (error) {
    log.error("[Payment Liquidation] Error applying payment to debts:", error);
    return { success: false, appliedAmount: 0 };
  }
}


// ===== FASE 1: TRANSACCIONES ACID Y VALIDACIONES =====

/**
 * Validar que el monto del pago no exceda la deuda pendiente total del apartamento
 */

export async function validatePaymentAmount(
  apartmentId: number,
  paymentAmount: number,
  tx?: any
): Promise<{ valid: boolean; reason?: string }> {
  const db = tx ?? await getDb();
  if (!db) return { valid: false, reason: "Base de datos no disponible" };
  
  const { eq: drizzleEq, and } = await import('drizzle-orm');
  
  try {
    // Obtener deudas pendientes del apartamento
    const pendingDebts = await db
      .select()
      .from(monthlyDebts)
      .where(and(
        drizzleEq(monthlyDebts.apartmentId, apartmentId),
        drizzleEq(monthlyDebts.isPaid, false)
      ));
    
    // Calcular deuda total pendiente
    const totalPending = pendingDebts.reduce((sum, debt) => {
      const pending = parseFloat(debt.pendingAmount as unknown as string) || 0;
      return sum + pending;
    }, 0);
    
    if (paymentAmount > totalPending + 0.01) { // Permitir pequeños errores de redondeo
      return {
        valid: false,
        reason: `El monto del pago ($${paymentAmount.toFixed(2)}) excede la deuda pendiente ($${totalPending.toFixed(2)})`
      };
    }
    
    return { valid: true };
  } catch (error) {
    log.error("[Payment Validation] Error validating payment amount:", error);
    return { valid: false, reason: "Error al validar el monto" };
  }
}

/**
 * Verificar si ya existe un pago aprobado para el mismo mes y apartamento
 */

export async function checkDuplicatePayment(apartmentId: number, month: string, excludePaymentId?: number): Promise<{ isDuplicate: boolean; existingPaymentId?: number }> {
  const db = await getDb();
  if (!db) return { isDuplicate: false };
  
  const { eq: drizzleEq, and, ne } = await import('drizzle-orm');
  
  try {
    let query = db
      .select()
      .from(payments)
      .where(and(
        drizzleEq(payments.apartmentId, apartmentId),
        drizzleEq(payments.month, month),
        drizzleEq(payments.status, "approved")
      ));
    
    // Si se proporciona un ID de pago, excluirlo de la búsqueda
    if (excludePaymentId) {
      query = db
        .select()
        .from(payments)
        .where(and(
          drizzleEq(payments.apartmentId, apartmentId),
          drizzleEq(payments.month, month),
          drizzleEq(payments.status, "approved"),
          ne(payments.id, excludePaymentId)
        ));
    }
    
    const result = await query;
    
    if (result.length > 0) {
      return { isDuplicate: true, existingPaymentId: result[0].id };
    }
    
    return { isDuplicate: false };
  } catch (error) {
    log.error("[Payment Validation] Error checking duplicate payment:", error);
    return { isDuplicate: false };
  }
}

/**
 * Validar que la fecha del pago no sea de un mes futuro
 */

export function validatePaymentMonth(paymentMonth: string): { valid: boolean; reason?: string } {
  try {
    // Validar formato YYYY-MM
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(paymentMonth)) {
      return {
        valid: false,
        reason: "Formato de mes inválido. Use YYYY-MM"
      };
    }
    
    const [year, month] = paymentMonth.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // Validar rango de mes
    if (monthNum < 1 || monthNum > 12) {
      return {
        valid: false,
        reason: "Mes inválido. Debe estar entre 01 y 12"
      };
    }
    
    // Validar que el año sea razonable (no demasiado antiguo ni futuro)
    const today = new Date();
    if (yearNum < today.getFullYear() - 10) {
      return {
        valid: false,
        reason: "Mes muy antiguo. Debe estar dentro de los últimos 10 años"
      };
    }
    
    if (yearNum > today.getFullYear() + 1) {
      return {
        valid: false,
        reason: "Año inválido. No se pueden cargar pagos demasiado en el futuro"
      };
    }
    
    // Permitir pagos parciales del mismo mes y meses anteriores
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: "Formato de mes inválido. Use YYYY-MM"
    };
  }
}

/**
 * Función mejorada de aprobación de pago con validaciones y transacciones ACID
 * Ejecuta todas las operaciones de forma atómica
 */

export async function approvePaymentWithValidations(
  paymentId: number,
  reviewedBy: number,
  notes?: string
): Promise<{
  success: boolean;
  message: string;
  appliedAmount?: number;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Base de datos no disponible" };
  }
  
  try {
    // Transacción ACID: todo o nada con bloqueo de fila
    return await db.transaction(async (tx) => {
      // 1. SELECT ... FOR UPDATE — bloquea la fila del pago
      const [payment]: typeof payments.$inferSelect[] = await tx.execute(
        sql`SELECT * FROM payments WHERE id = ${paymentId} FOR UPDATE`
      );

      if (!payment) {
        return { success: false, message: "Pago no encontrado" };
      }

      const paymentAmount = parseFloat(payment.amount as unknown as string);

      // 2. Validar mes del pago
      const monthValidation = validatePaymentMonth(payment.month);
      if (!monthValidation.valid) {
        return { success: false, message: monthValidation.reason || "Fecha inválida" };
      }

      // 3. Validar que el monto no exceda la deuda pendiente (dentro de la tx)
      const amountValidation = await validatePaymentAmount(payment.apartmentId, paymentAmount, tx);
      if (!amountValidation.valid) {
        return { success: false, message: amountValidation.reason || "Monto inválido" };
      }

      // 4. Actualizar estado del pago
      await tx.update(payments)
        .set({
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy,
          notes: notes || null,
        })
        .where(eq(payments.id, paymentId));

      // 5. Aplicar liquidación de deudas (dentro de la misma tx)
      const liquidationResult = await applyPaymentToDebts(payment.apartmentId, paymentAmount, tx);

      if (!liquidationResult || !liquidationResult.success) {
        // La tx.rollback() ocurre automáticamente si lanzamos un error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al liquidar las deudas — transacción revertida",
        });
      }

      // 6. Crear log de auditoría
      await tx.insert(auditLog).values({
        userId: reviewedBy,
        action: "approve_payment",
        entityType: "payment",
        entityId: paymentId,
        details: `Pago aprobado: $${paymentAmount.toFixed(2)} - ${notes || "Sin notas"}`,
      });

      return {
        success: true,
        message: "Pago aprobado exitosamente",
        appliedAmount: liquidationResult?.appliedAmount,
      };
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      return { success: false, message: error.message };
    }
    log.error("[Payment Approval] Error approving payment:", error);
    return { success: false, message: "Error al aprobar el pago" };
  }
}


// ===== FASE 3: NOTIFICACIONES =====

/**
 * Crear una notificación para un usuario
 */

export async function uploadPaymentVoucher(
  paymentId: number,
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  mimeType: string
) {
  const { createPresignedUploadUrl } = await import("../_core/storage");
  
  try {
    // Validar tipo MIME
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
    }

    // Validar tamaño máximo (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileBuffer.length > maxSize) {
      throw new Error(`Archivo muy grande. Máximo: 5MB`);
    }

    // Generar clave única en S3
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const extension = getFileExtension(mimeType);
    const s3Key = `payments/${paymentId}/${timestamp}-${randomSuffix}.${extension}`;

    // Obtener presigned URL y subir
    const { signedUrl, publicUrl } = await createPresignedUploadUrl(s3Key);
    
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: fileBuffer as BodyInit,
      headers: { "Content-Type": mimeType },
    });
    
    if (!response.ok) {
      throw new Error(`Error subiendo archivo: ${response.statusText}`);
    }

    // Guardar URL en BD
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    await db
      .update(payments)
      .set({
        voucherImageUrl: publicUrl,
        voucherImageKey: s3Key,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    return { url: publicUrl, key: s3Key };
  } catch (error) {
    log.error("[S3] Error uploading voucher:", error);
    throw error;
  }
}

/**
 * Obtener URL del comprobante de pago
 */

export async function getPaymentVoucherUrl(paymentId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  
  try {
    const payment = await db
      .select({ voucherImageUrl: payments.voucherImageUrl })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    return payment[0]?.voucherImageUrl || null;
  } catch (error) {
    log.error("[S3] Error getting voucher URL:", error);
    return null;
  }
}

/**
 * Eliminar comprobante de pago de S3
 */

export async function deletePaymentVoucher(paymentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  
  try {
    // Obtener clave del archivo
    const payment = await db
      .select({ voucherImageKey: payments.voucherImageKey })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment[0]?.voucherImageKey) {
      return true; // No hay archivo que eliminar
    }

    // TODO: Implementar eliminación en S3 cuando la API lo permita
    // Por ahora solo limpiamos la BD

    // Limpiar referencias en BD
    await db
      .update(payments)
      .set({
        voucherImageUrl: null,
        voucherImageKey: null,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    return true;
  } catch (error) {
    log.error("[S3] Error deleting voucher:", error);
    return false;
  }
}

/**
 * Obtener extension de archivo basada en MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return mimeToExt[mimeType] || "bin";
}


// ===== FASE 5: REPORTES =====

/**
 * Obtener datos para reporte mensual de un apartamento
 */
