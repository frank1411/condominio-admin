import { desc, eq } from "drizzle-orm";
import { charges, monthlyDebts } from "../../drizzle/schema";
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

export async function deleteCharge(id: number) {
  const db = await getDb();
  if (!db) return null;
  // Eliminar todas las deudas generadas por este cobro
  await db.delete(monthlyDebts).where(eq(monthlyDebts.chargeId, id));
  // Marcar el cobro como inactivo
  return await db.update(charges).set({ isActive: false }).where(eq(charges.id, id));
}
