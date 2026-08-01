import { and, asc, eq, inArray } from "drizzle-orm";
import { createLogger } from "../_core/logger";

const log = createLogger("debts");
import { apartments, charges, floors, monthlyDebts } from "../../drizzle/schema";
import { getDb } from "./client";
import { getUserById } from "./users";
import { getAllApartments, getCondominiumConfig } from "./condominium";

export async function getMonthlyDebt(apartmentId: number, month: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(monthlyDebts).where(
    and(eq(monthlyDebts.apartmentId, apartmentId), eq(monthlyDebts.month, month))
  );
  
  return result.length > 0 ? result[0] : null;
}

export async function createOrUpdateMonthlyDebt(data: typeof monthlyDebts.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getMonthlyDebt(data.apartmentId, data.month);
  
  if (existing) {
    return await db.update(monthlyDebts).set(data).where(
      and(eq(monthlyDebts.apartmentId, data.apartmentId), eq(monthlyDebts.month, data.month))
    );
  } else {
    return await db.insert(monthlyDebts).values(data);
  }
}

export async function getDebtsByMonth(month: string) {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq } = await import('drizzle-orm');
  const result = await db
    .select({
      id: monthlyDebts.id,
      apartmentId: monthlyDebts.apartmentId,
      unitName: apartments.unitName,
      month: monthlyDebts.month,
      totalDue: monthlyDebts.totalDue,
      totalPaid: monthlyDebts.totalPaid,
      pendingAmount: monthlyDebts.pendingAmount,
      currency: monthlyDebts.currency,
      isPaid: monthlyDebts.isPaid,
      createdAt: monthlyDebts.createdAt,
      updatedAt: monthlyDebts.updatedAt,
    })
    .from(monthlyDebts)
    .innerJoin(apartments, drizzleEq(monthlyDebts.apartmentId, apartments.id))
    .where(drizzleEq(monthlyDebts.month, month));
  return result;
}

export async function getAllUserDebts(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const user = await getUserById(userId);
  if (!user || !user.apartmentId) return [];

  const { eq: drizzleEq } = await import('drizzle-orm');
  const result = await db
    .select({
      id: monthlyDebts.id,
      apartmentId: monthlyDebts.apartmentId,
      unitName: apartments.unitName,
      month: monthlyDebts.month,
      totalDue: monthlyDebts.totalDue,
      totalPaid: monthlyDebts.totalPaid,
      pendingAmount: monthlyDebts.pendingAmount,
      currency: monthlyDebts.currency,
      isPaid: monthlyDebts.isPaid,
      createdAt: monthlyDebts.createdAt,
      updatedAt: monthlyDebts.updatedAt,
      creditBalance: apartments.creditBalance,
    })
    .from(monthlyDebts)
    .innerJoin(apartments, drizzleEq(monthlyDebts.apartmentId, apartments.id))
    .where(drizzleEq(monthlyDebts.apartmentId, user.apartmentId));
  return result;
}

/**
 * Aplica el saldo a favor (crédito) del apartamento a una deuda pendiente.
 * Reduce pendingAmount con el crédito disponible, consume creditBalance y
 * marca la deuda como pagada si queda en 0.
 */
async function applyCreditToDebt(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  debt: typeof monthlyDebts.$inferSelect,
  apt: { id: number; creditBalance: string | null }
) {
  const pending = parseFloat(debt.pendingAmount as unknown as string);
  if (!pending || pending <= 0) return;

  const credit = parseFloat(apt.creditBalance || "0") || 0;
  if (credit <= 0) return;

  const creditToApply = Math.min(credit, pending);
  const newPending = pending - creditToApply;
  const newCredit = credit - creditToApply;

  await db.update(apartments)
    .set({ creditBalance: newCredit.toFixed(2) })
    .where(eq(apartments.id, apt.id));

  await db.update(monthlyDebts)
    .set({
      pendingAmount: newPending.toFixed(2),
      isPaid: newPending <= 0.005,
    })
    .where(eq(monthlyDebts.id, debt.id));

  log.info(
    { apartmentId: apt.id, month: debt.month, creditToApply, newPending },
    "[Debt Generation] Applied credit balance to debt"
  );
}

export async function generateDebtsFromCharge(chargeId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Obtener el cobro
    const charge = await db.select().from(charges).where(eq(charges.id, chargeId)).limit(1);
    if (!charge || charge.length === 0) {
      log.error(`[Debt Generation] Charge ${chargeId} not found`);
      return;
    }

    const chargeData = charge[0];
    const currentMonth = new Date();
    const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const chargeAmount = parseFloat(chargeData.amount as unknown as string);

    // Si es cobro individual, generar deuda solo para ese apartamento
    if (chargeData.apartmentId) {
      const existingDebt = await db
        .select()
        .from(monthlyDebts)
        .where(
          and(
            eq(monthlyDebts.apartmentId, chargeData.apartmentId),
            eq(monthlyDebts.month, month)
          )
        )
        .limit(1);

      if (existingDebt && existingDebt.length > 0) {
        // Actualizar deuda existente
        const debt = existingDebt[0];
          const totalDue = parseFloat(debt.totalDue as unknown as string) + chargeAmount;
          const pendingAmount = parseFloat(debt.pendingAmount as unknown as string) + chargeAmount;

          await db.update(monthlyDebts)
            .set({
              totalDue: totalDue.toString(),
              pendingAmount: pendingAmount.toString(),
            })
          .where(eq(monthlyDebts.id, debt.id));
      } else {
        // Crear nueva deuda
        await db.insert(monthlyDebts).values({
          apartmentId: chargeData.apartmentId,
          chargeId: chargeId,
          month,
          totalDue: chargeAmount.toString(),
          pendingAmount: chargeAmount.toString(),
          isPaid: false,
        });
      }

      // Aplicar saldo a favor (crédito) del apartamento a la deuda del mes
      const creditApt = await db
        .select({ id: apartments.id, creditBalance: apartments.creditBalance })
        .from(apartments)
        .where(eq(apartments.id, chargeData.apartmentId))
        .limit(1);

      if (creditApt.length > 0 && (parseFloat(creditApt[0].creditBalance || "0") || 0) > 0) {
        const freshDebt = await db
          .select()
          .from(monthlyDebts)
          .where(
            and(
              eq(monthlyDebts.apartmentId, chargeData.apartmentId),
              eq(monthlyDebts.month, month)
            )
          )
          .limit(1);

        if (freshDebt.length > 0) {
          await applyCreditToDebt(db, freshDebt[0], creditApt[0]);
        }
      }
    } else {
      // Si es cobro global, generar deuda para todos los apartamentos
      const allApartments = await db.select().from(apartments);

      if (allApartments.length === 0) return;

      // Batch SELECT: traer todas las deudas existentes del mes en 1 query
      const apartmentIds = allApartments.map(a => a.id);
      const existingDebts = await db
        .select()
        .from(monthlyDebts)
        .where(
          and(
            eq(monthlyDebts.month, month),
            inArray(monthlyDebts.apartmentId, apartmentIds)
          )
        );

      // Map rápido: apartmentId → deuda existente
      const debtMap = new Map(existingDebts.map(d => [d.apartmentId, d]));

      // Separar: los que ya tienen deuda (UPDATE) vs los nuevos (bulk INSERT)
      const toInsert: (typeof monthlyDebts.$inferInsert)[] = [];

      for (const apt of allApartments) {
        const existing = debtMap.get(apt.id);
        if (existing) {
          // Actualizar deuda existente: sumar el nuevo cobro
          const totalDue = parseFloat(existing.totalDue as unknown as string) + chargeAmount;
          const pendingAmount = parseFloat(existing.pendingAmount as unknown as string) + chargeAmount;

          await db.update(monthlyDebts)
            .set({
              totalDue: totalDue.toString(),
              pendingAmount: pendingAmount.toString(),
            })
            .where(eq(monthlyDebts.id, existing.id));
        } else {
          toInsert.push({
            apartmentId: apt.id,
            chargeId,
            month,
            totalDue: chargeAmount.toString(),
            pendingAmount: chargeAmount.toString(),
            isPaid: false,
          });
        }
      }

      // Bulk INSERT: todas las deudas nuevas en 1 sola query
      if (toInsert.length > 0) {
        await db.insert(monthlyDebts).values(toInsert);
      }

      // Aplicar saldo a favor (crédito) a los aptos que tengan crédito disponible.
      // Batch: primero filtrar aptos con crédito, luego sus deudas del mes.
      const aptsWithCredit = allApartments.filter(
        a => (parseFloat(a.creditBalance || "0") || 0) > 0
      );

      if (aptsWithCredit.length > 0) {
        const creditAptIds = aptsWithCredit.map(a => a.id);
        const creditDebts = await db
          .select()
          .from(monthlyDebts)
          .where(
            and(
              eq(monthlyDebts.month, month),
              inArray(monthlyDebts.apartmentId, creditAptIds)
            )
          );

        const creditDebtMap = new Map(creditDebts.map(d => [d.apartmentId, d]));
        for (const apt of aptsWithCredit) {
          const debt = creditDebtMap.get(apt.id);
          if (debt) {
            await applyCreditToDebt(db, debt, apt);
          }
        }
      }
    }

    log.info(`[Debt Generation] Successfully generated debts for charge ${chargeId}`);
  } catch (error) {
    log.error({ err: error }, `[Debt Generation] Error generating debts for charge ${chargeId}:`);
  }
}


export async function hasAnyPendingDebt(apartmentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  const result = await db
    .select({ id: monthlyDebts.id })
    .from(monthlyDebts)
    .where(
      and(
        drizzleEq(monthlyDebts.apartmentId, apartmentId),
        drizzleEq(monthlyDebts.isPaid, false)
      )
    )
    .limit(1);
  
  return result.length > 0;
}

/**
 * Obtener todas las deudas de un apartamento (sin importar el mes)
 */

export async function getAllApartmentDebts(apartmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  const result = await db
    .select({
      id: monthlyDebts.id,
      apartmentId: monthlyDebts.apartmentId,
      month: monthlyDebts.month,
      totalDue: monthlyDebts.totalDue,
      totalPaid: monthlyDebts.totalPaid,
      pendingAmount: monthlyDebts.pendingAmount,
      currency: monthlyDebts.currency,
      isPaid: monthlyDebts.isPaid,
      createdAt: monthlyDebts.createdAt,
      updatedAt: monthlyDebts.updatedAt,
    })
    .from(monthlyDebts)
    .where(drizzleEq(monthlyDebts.apartmentId, apartmentId))
    .orderBy(asc(monthlyDebts.month));
  
  return result;
}

/**
 * Nueva función: Retorna TODOS los apartamentos con su estado de deuda para un mes específico
 * Incluye apartamentos sin deuda registrada (aparecerán como "Pagado")
 * Soporta ordenamiento por: 'floor' (piso), 'name' (nombre), 'status' (estado de pago)
 */

export async function getAllApartmentsWithDebtStatus(month: string, sortBy: 'floor' | 'name' | 'status' = 'floor') {
  const db = await getDb();
  if (!db) return [];
  
  const { eq: drizzleEq, asc } = await import('drizzle-orm');
  
  // Obtener todos los apartamentos
  const allApts = await db.select().from(apartments).orderBy(asc(apartments.id));
  
  // Obtener deudas del mes actual
  const debts = await db
    .select({
      id: monthlyDebts.id,
      apartmentId: monthlyDebts.apartmentId,
      unitName: apartments.unitName,
      month: monthlyDebts.month,
      totalDue: monthlyDebts.totalDue,
      totalPaid: monthlyDebts.totalPaid,
      pendingAmount: monthlyDebts.pendingAmount,
      currency: monthlyDebts.currency,
      isPaid: monthlyDebts.isPaid,
      createdAt: monthlyDebts.createdAt,
      updatedAt: monthlyDebts.updatedAt,
      floorId: apartments.floorId,
    })
    .from(monthlyDebts)
    .innerJoin(apartments, drizzleEq(monthlyDebts.apartmentId, apartments.id))
    .where(drizzleEq(monthlyDebts.month, month));
  
  // Crear mapa de deudas por apartamento
  const debtMap = new Map(debts.map(d => [d.apartmentId, d]));
  
  // Obtener información de pisos
  const allFloors = await db.select().from(floors);
  const floorMap = new Map(allFloors.map(f => [f.id, f]));
  
  // Construir resultado con TODOS los apartamentos
  const result = allApts.map(apt => {
    const debt = debtMap.get(apt.id);
    const floor = floorMap.get(apt.floorId);
    
    return {
      id: debt?.id || null,
      apartmentId: apt.id,
      unitName: apt.unitName || `Apt-${apt.apartmentNumber}`,
      month: debt?.month || month,
      totalDue: debt?.totalDue || "0.00",
      totalPaid: debt?.totalPaid || "0.00",
      pendingAmount: debt?.pendingAmount || "0.00",
      currency: debt?.currency || "USD",
      isPaid: debt?.isPaid ?? true, // Si no hay deuda, considerarlo pagado
      createdAt: debt?.createdAt,
      updatedAt: debt?.updatedAt,
      floorId: apt.floorId,
      floorName: floor?.floorName || `Piso ${floor?.floorNumber}`,
      apartmentNumber: apt.apartmentNumber,
      creditBalance: apt.creditBalance || "0.00", // saldo a favor del apartamento
    };
  });
  
  // Aplicar ordenamiento
  if (sortBy === 'name') {
    result.sort((a, b) => (a.unitName || '').localeCompare(b.unitName || ''));
  } else if (sortBy === 'status') {
    result.sort((a, b) => {
      // Primero pendientes, luego pagados
      if (a.isPaid === b.isPaid) {
        return (a.unitName || '').localeCompare(b.unitName || '');
      }
      return a.isPaid ? 1 : -1;
    });
  } else {
    // Por defecto, ordenar por piso y luego por número de apartamento
    result.sort((a, b) => {
      if (a.floorId !== b.floorId) {
        return a.floorId - b.floorId;
      }
      return a.apartmentNumber.localeCompare(b.apartmentNumber);
    });
  }

  return result;
}

// ============================================
// SHARED HELPERS
// ============================================

export function computeDebtSummary(debts: Array<{
  isPaid: boolean;
  pendingAmount: string | number;
  totalDue: string | number;
}>) {
  const totalApartments = debts.length;
  const apartmentsWithDebt = debts.filter(d => !d.isPaid);
  const apartmentsWithoutDebt = totalApartments - apartmentsWithDebt.length;
  const totalPending = apartmentsWithDebt.reduce(
    (sum, d) => sum + parseFloat(String(d.pendingAmount)), 0
  );
  const totalDue = debts.reduce(
    (sum, d) => sum + parseFloat(String(d.totalDue)), 0
  );
  return { totalApartments, apartmentsWithDebt, apartmentsWithoutDebt, totalPending, totalDue };
}