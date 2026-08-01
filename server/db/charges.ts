import { and, desc, eq, inArray } from "drizzle-orm";
import { apartments, charges, monthlyDebts } from "../../drizzle/schema";
import { getDb } from "./client";

export async function getAllCharges() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(charges).where(eq(charges.isActive, true));
}

export async function createCharge(data: typeof charges.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(charges).values(data);
  const created = await db.select().from(charges).where(eq(charges.name, data.name || '')).orderBy(desc(charges.createdAt)).limit(1);
  return created && created.length > 0 ? created[0] : null;
}

export async function updateCharge(id: number, data: Partial<typeof charges.$inferInsert>) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(charges).set(data).where(eq(charges.id, id));
}

/**
 * Eliminar un cobro (soft delete: isActive=false) con REVERSA CONSOLIDADA:
 *
 * BUG-003: antes se hacía `DELETE FROM monthlyDebts WHERE chargeId = id`, pero
 * cuando varios cobros del mismo mes se consolidan en UNA fila de deuda (el
 * chargeId queda apuntando al primer cobro), ese DELETE no encontraba filas y
 * el monto del cobro eliminado quedaba "fantasma" en la deuda.
 *
 * Ahora:
 * 1. Calcula el mes de las deudas que generó este cobro (mes de su creación).
 * 2. Resta el monto del cobro de cada deuda afectada (apto individual o todos).
 *    Si la deuda queda en 0, se elimina; si no, se ajusta totalDue/pendingAmount.
 * 3. BLOQUEA la eliminación si alguna deuda afectada ya tiene pagos aplicados
 *    (totalPaid > 0 o isPaid), para no dejar pagos huérfanos.
 * Todo dentro de una transacción (defensa en profundidad).
 */
export async function deleteCharge(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.transaction(async (tx) => {
    // Obtener el cobro
    const chargeResult = await tx.select().from(charges).where(eq(charges.id, id)).limit(1);
    if (!chargeResult || chargeResult.length === 0) return null;
    const charge = chargeResult[0];

    // Mes de las deudas que generó este cobro = mes de su creación
    const created = charge.createdAt ? new Date(charge.createdAt) : new Date();
    const month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const amount = parseFloat(charge.amount as unknown as string) || 0;

    // Aptos afectados por este cobro (individual → 1; global → todos)
    let affectedApartmentIds: number[] = [];
    if (charge.apartmentId) {
      affectedApartmentIds = [charge.apartmentId];
    } else {
      const all = await tx.select({ id: apartments.id }).from(apartments);
      affectedApartmentIds = all.map(a => a.id);
    }

    if (affectedApartmentIds.length > 0) {
      // Deudas del mes de creación que incluyen este cobro
      const debts = await tx
        .select()
        .from(monthlyDebts)
        .where(and(
          eq(monthlyDebts.month, month),
          inArray(monthlyDebts.apartmentId, affectedApartmentIds)
        ));

      // BLOQUEO: si alguna deuda afectada ya tiene pagos aplicados
      const paidDebts = debts.filter(d =>
        (parseFloat(d.totalPaid as unknown as string) || 0) > 0 || d.isPaid
      );
      if (paidDebts.length > 0) {
        throw new Error(
          `No se puede eliminar el cobro "${charge.name}": hay deudas ya pagadas en ${month}. Elimina los pagos asociados primero.`
        );
      }

      // Reversa: restar el monto del cobro de cada deuda afectada
      for (const debt of debts) {
        const due = parseFloat(debt.totalDue as unknown as string) || 0;
        const pending = parseFloat(debt.pendingAmount as unknown as string) || 0;
        const newDue = Math.max(0, due - amount);
        const newPending = Math.max(0, pending - amount);

        if (newDue <= 0 && newPending <= 0) {
          // La deuda solo contenía este cobro: eliminarla
          await tx.delete(monthlyDebts).where(eq(monthlyDebts.id, debt.id));
        } else {
          await tx.update(monthlyDebts)
            .set({
              totalDue: newDue.toFixed(2),
              pendingAmount: newPending.toFixed(2),
            })
            .where(eq(monthlyDebts.id, debt.id));
        }
      }
    }

    // Soft delete: marcar el cobro como inactivo
    return await tx.update(charges).set({ isActive: false }).where(eq(charges.id, id));
  });
}
