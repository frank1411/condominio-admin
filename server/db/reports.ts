import { and, asc, desc, eq, sql } from "drizzle-orm";
import { payments, monthlyDebts, apartments, charges, users } from "../../drizzle/schema";
import { createLogger } from "../_core/logger";
import { getDb } from "./client";
import { getCondominiumConfig } from "./condominium";
import { getUserById } from "./users";
import { getDebtsByMonth } from "./debts";

const log = createLogger("reports");

export async function getMonthlyReportData(apartmentId: number, month: string) {
  const db = await getDb();
  if (!db) return null;


  try {
    // Obtener información del apartamento
    const apartment = await db
      .select()
      .from(apartments)
      .where(eq(apartments.id, apartmentId))
      .limit(1);

    if (!apartment[0]) return null;

    // Obtener pagos del mes
    const monthPayments = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.apartmentId, apartmentId),
          eq(payments.month, month)
        )
      );

    // Obtener deudas del mes
    const monthDebts = await db
      .select()
      .from(monthlyDebts)
      .where(
        and(
          eq(monthlyDebts.apartmentId, apartmentId),
          eq(monthlyDebts.month, month)
        )
      );

    // Obtener configuración del condominio
    const config = await getCondominiumConfig();

    return {
      apartment: apartment[0],
      payments: monthPayments,
      debts: monthDebts,
      config,
      month,
    };
  } catch (error) {
    log.error({ err: error }, "[Reports] Error getting monthly report data:");
    return null;
  }
}

/**
 * Obtener resumen de pagos y deudas para un usuario
 */
export async function getUserPaymentsSummary(userId: number, limit: number = 12) {
  const db = await getDb();
  if (!db) return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };


  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0] || !user[0].apartmentId) {
      return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
    }

    // Obtener últimos pagos
    const userPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.apartmentId, user[0].apartmentId))
      .orderBy(desc(payments.submittedAt))
      .limit(limit);

    // Obtener deudas pendientes
    const userDebts = await db
      .select()
      .from(monthlyDebts)
      .where(
        and(
          eq(monthlyDebts.apartmentId, user[0].apartmentId),
          eq(monthlyDebts.isPaid, false)
        )
      )
      .orderBy(asc(monthlyDebts.month));

    // Calcular totales
    const totalPaid = userPayments
      .filter(p => p.status === "approved")
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

    const totalPending = userDebts.reduce((sum, d) => sum + parseFloat(d.pendingAmount || "0"), 0);

    return {
      payments: userPayments,
      debts: userDebts,
      totalPaid: totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2),
    };
  } catch (error) {
    log.error({ err: error }, "[Reports] Error getting user payments summary:");
    return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
  }
}

/**
 * Obtener reporte de deudas totales por mes (para admin)
 */
export async function getMonthlyDebtsSummary(month: string) {
  const db = await getDb();
  if (!db) return [];


  try {
    return await db
      .select()
      .from(monthlyDebts)
      .where(eq(monthlyDebts.month, month))
      .orderBy(desc(monthlyDebts.pendingAmount));
  } catch (error) {
    log.error({ err: error }, "[Reports] Error getting monthly debts summary:");
    return [];
  }
}

/**
 * Obtener reporte de pagos por estado (para admin)
 */
export async function getPaymentsByStatus(status: "pending" | "approved" | "rejected", month?: string) {
  const db = await getDb();
  if (!db) return [];


  try {
    let query = db
      .select()
      .from(payments)
      .where(eq(payments.status, status));

    if (month) {
      query = db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.status, status),
            eq(payments.month, month)
          )
        );
    }

    return await query.orderBy(desc(payments.submittedAt));
  } catch (error) {
    log.error({ err: error }, "[Reports] Error getting payments by status:");
    return [];
  }
}

/**
 * Generar reporte en formato JSON para exportar
 */
export async function generateReportJSON(apartmentId: number, month: string) {
  const reportData = await getMonthlyReportData(apartmentId, month);
  if (!reportData) return null;

  return {
    generatedAt: new Date().toISOString(),
    apartment: {
      id: reportData.apartment.id,
      number: reportData.apartment.apartmentNumber,
      name: reportData.apartment.unitName,
    },
    month: reportData.month,
    payments: reportData.payments.map(p => ({
      id: p.id,
      voucherNumber: p.voucherNumber,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt,
    })),
    debts: reportData.debts.map(d => ({
      id: d.id,
      month: d.month,
      totalDue: d.totalDue,
      pendingAmount: d.pendingAmount,
      isPaid: d.isPaid,
      createdAt: d.createdAt,
    })),
    summary: {
      totalPayments: reportData.payments.length,
      approvedPayments: reportData.payments.filter(p => p.status === "approved").length,
      totalDebts: reportData.debts.length,
      paidDebts: reportData.debts.filter(d => d.isPaid).length,
      totalAmount: reportData.debts.reduce((sum, d) => sum + parseFloat(d.totalDue || "0"), 0).toFixed(2),
      totalPending: reportData.debts.reduce((sum, d) => sum + parseFloat(d.pendingAmount || "0"), 0).toFixed(2),
    },
  };
}


/**
 * Obtener TODAS las deudas pendientes de un apartamento (sin importar el mes)
 * Retorna true si existe al menos una deuda sin pagar
 */