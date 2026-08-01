import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { apartments, charges, monthlyDebts } from "../../drizzle/schema";
import { getDb } from "./client";

export async function getAllCharges() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(charges).where(eq(charges.isActive, true));
}

/**
 * EDG-03 (MEJORA-007): rechazar doble-submit / doble POST de un cobro
 * idéntico (mismo nombre + monto + alcance) creado en los últimos 2 min.
 * Defensa server-side — la UI ya deshabilita el botón.
 */
const RECENT_CHARGE_WINDOW_MS = 2 * 60 * 1000;

export async function createCharge(data: typeof charges.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  // Guard anti-duplicado: mismo name + amount + apartmentId reciente
  const conditions: any[] = [
    eq(charges.isActive, true),
    eq(charges.name, data.name || ""),
    eq(charges.amount, String(data.amount || "")),
    gt(charges.createdAt, new Date(Date.now() - RECENT_CHARGE_WINDOW_MS)),
  ];
  if (data.apartmentId) {
    conditions.push(eq(charges.apartmentId, data.apartmentId));
  } else {
    conditions.push(isNull(charges.apartmentId));
  }
  const recent = await db
    .select({ id: charges.id })
    .from(charges)
    .where(and(...conditions))
    .limit(1);

  if (recent.length > 0) {
    const err = new Error(
      "Este cobro ya fue creado hace un momento (mismo nombre, monto y alcance). ¿Doble clic?"
    ) as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  await db.insert(charges).values(data);
  const created = await db.select().from(charges).where(eq(charges.name, data.name || '')).orderBy(desc(charges.createdAt)).limit(1);
  return created && created.length > 0 ? created[0] : null;
}

/**
 * Actualizar un cobro. COB-04: si cambia el monto, ajusta las deudas VIGENTES
 * (mes actual) de los aptos a los que aplica el cobro con la diferencia
 * (nuevo - viejo). Sin lógica de meses históricos — todos los cobros tienen
 * la misma jerarquía. Si la deuda baja y el apto ya pagó más de lo que ahora
 * debe, el excedente se convierte en saldo a favor (creditBalance).
 * El alcance (individual/global/apto) NO se edita — se bloquea en la UI
 * (se crea/elimina el cobro si cambia el alcance). Transaccional.
 */
export async function updateCharge(id: number, data: Partial<typeof charges.$inferInsert>) {
  const db = await getDb();
  if (!db) return null;

  return await db.transaction(async (tx) => {
    const chargeResult = await tx.select().from(charges).where(eq(charges.id, id)).limit(1);
    if (!chargeResult || chargeResult.length === 0) return null;
    const charge = chargeResult[0];

    // COB-04: solo el monto cambia deudas (alcance inmutable en edición)
    if (data.amount !== undefined) {
      const oldAmount = parseFloat(charge.amount as unknown as string) || 0;
      const newAmount = parseFloat(data.amount as unknown as string) || 0;
      const delta = newAmount - oldAmount;
      if (Math.abs(delta) > 0.005) {
        // Aptos afectados por este cobro (individual → 1; global → todos)
        let affectedApartmentIds: number[] = [];
        if (charge.apartmentId) {
          affectedApartmentIds = [charge.apartmentId];
        } else {
          const all = await tx.select({ id: apartments.id }).from(apartments);
          affectedApartmentIds = all.map(a => a.id);
        }

        // Deudas vigentes (mes actual) de los aptos afectados
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const debts = await tx
          .select()
          .from(monthlyDebts)
          .where(and(
            eq(monthlyDebts.month, currentMonth),
            inArray(monthlyDebts.apartmentId, affectedApartmentIds)
          ));

        for (const debt of debts) {
          const due = parseFloat(debt.totalDue as unknown as string) || 0;
          const paid = parseFloat(debt.totalPaid as unknown as string) || 0;
          const newDue = Math.max(0, due + delta);

          // Excedente pagado sobre la nueva deuda → creditBalance del apto
          let excessToCredit = 0;
          let adjustedPaid = paid;
          if (paid > newDue) {
            excessToCredit = paid - newDue;
            adjustedPaid = newDue;
          }
          const newPending = Math.max(0, newDue - adjustedPaid);

          if (excessToCredit > 0.005) {
            const apt = await tx
              .select({ creditBalance: apartments.creditBalance })
              .from(apartments)
              .where(eq(apartments.id, debt.apartmentId))
              .limit(1);
            const currentCredit = apt.length > 0 ? (parseFloat(apt[0].creditBalance as unknown as string) || 0) : 0;
            await tx.update(apartments)
              .set({ creditBalance: (currentCredit + excessToCredit).toFixed(2) })
              .where(eq(apartments.id, debt.apartmentId));
          }

          if (newDue <= 0 && newPending <= 0 && adjustedPaid <= 0.005) {
            await tx.delete(monthlyDebts).where(eq(monthlyDebts.id, debt.id));
          } else {
            await tx.update(monthlyDebts)
              .set({
                totalDue: newDue.toFixed(2),
                totalPaid: adjustedPaid.toFixed(2),
                pendingAmount: newPending.toFixed(2),
                isPaid: newPending <= 0.005,
              })
              .where(eq(monthlyDebts.id, debt.id));
          }
        }
      }
    }

    await tx.update(charges).set(data).where(eq(charges.id, id));
    return true;
  });
}

/**
 * Eliminar un cobro (soft delete: isActive=false) con REVERSA CONSOLIDADA:
 *
 * BUG-003: antes se hacía `DELETE FROM monthlyDebts WHERE chargeId = id`, pero
 * cuando varios cobros del mismo mes se consolidan en UNA fila de deuda (el
 * chargeId queda apuntando al primer cobro), ese DELETE no encontraba filas y
 * el monto del cobro eliminado quedaba "fantasma" en la deuda.
 *
 * Ahora (regla de negocio 3 — "cualquier cobro se elimina, pagado o no"):
 * 1. Calcula el mes de las deudas que generó este cobro (mes de su creación).
 * 2. Resta el monto del cobro de cada deuda afectada (apto individual o todos).
 *    Si la deuda queda en 0, se elimina; si no, se ajusta totalDue/pendingAmount.
 * 3. SIN BLOQUEO por pagos: si el apto ya pagó más de lo que ahora debe tras la
 *    reversa (totalPaid > nuevo totalDue), el excedente se convierte en saldo a
 *    favor (creditBalance) del apartamento — ningún pago queda huérfano.
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

      // Reversa: restar el monto del cobro de cada deuda afectada.
      // Regla de negocio 3: SIN bloqueo por pagos — si el apto ya pagó más de lo
      // que ahora debe, el excedente se convierte en saldo a favor (crédito).
      for (const debt of debts) {
        const due = parseFloat(debt.totalDue as unknown as string) || 0;
        const paid = parseFloat(debt.totalPaid as unknown as string) || 0;
        const pending = parseFloat(debt.pendingAmount as unknown as string) || 0;
        const newDue = Math.max(0, due - amount);

        // Excedente pagado sobre la nueva deuda → creditBalance del apto
        let excessToCredit = 0;
        let adjustedPaid = paid;
        if (paid > newDue) {
          excessToCredit = paid - newDue;
          adjustedPaid = newDue;
        }
        const newPending = Math.max(0, newDue - adjustedPaid);

        if (excessToCredit > 0.005) {
          const apt = await tx
            .select({ creditBalance: apartments.creditBalance })
            .from(apartments)
            .where(eq(apartments.id, debt.apartmentId))
            .limit(1);
          const currentCredit = apt.length > 0 ? (parseFloat(apt[0].creditBalance as unknown as string) || 0) : 0;
          await tx.update(apartments)
            .set({ creditBalance: (currentCredit + excessToCredit).toFixed(2) })
            .where(eq(apartments.id, debt.apartmentId));
        }

        if (newDue <= 0 && newPending <= 0 && adjustedPaid <= 0.005) {
          // La deuda solo contenía este cobro y no había pagos: eliminarla
          await tx.delete(monthlyDebts).where(eq(monthlyDebts.id, debt.id));
        } else {
          await tx.update(monthlyDebts)
            .set({
              totalDue: newDue.toFixed(2),
              totalPaid: adjustedPaid.toFixed(2),
              pendingAmount: newPending.toFixed(2),
              isPaid: newPending <= 0.005,
            })
            .where(eq(monthlyDebts.id, debt.id));
        }
      }
    }

    // Soft delete: marcar el cobro como inactivo
    return await tx.update(charges).set({ isActive: false }).where(eq(charges.id, id));
  });
}
