import { auditLog } from "../../drizzle/schema";
import { getDb } from "./client";

export async function createAuditLog(data: typeof auditLog.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  return await db.insert(auditLog).values(data);
}
