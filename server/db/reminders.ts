import { eq } from "drizzle-orm";
import { reminders } from "../../drizzle/schema";
import { getDb } from "./client";

export async function createReminder(data: typeof reminders.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  return await db.insert(reminders).values(data);
}

export async function getPendingReminders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reminders).where(eq(reminders.status, "pending"));
}

export async function updateReminderStatus(id: number, status: "sent" | "failed") {
  const db = await getDb();
  if (!db) return null;
  return await db.update(reminders).set({ status, sentAt: new Date() }).where(eq(reminders.id, id));
}
