import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createLogger } from "../_core/logger";

const log = createLogger("client");

let _db: ReturnType<typeof drizzle> | null = null;
let _pgClient: ReturnType<typeof postgres> | null = null;

/** Tipo del cliente de base de datos (no-null). */
export type DbClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Tipo de una transacción abierta con db.transaction(). */
export type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export async function getDb() {
  if (!_db) {
    console.log("[db] DATABASE_URL present:", !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
      try {
        console.log("[db] Attempting connection...");
        _pgClient = postgres(process.env.DATABASE_URL, {
          max: 10,
          idle_timeout: 30,
          connect_timeout: 10,
          prepare: false,
          max_lifetime: 60 * 5,
        });
        _db = drizzle(_pgClient);
        console.log("[db] Connected successfully");
      } catch (error) {
        console.warn("[db] Failed to connect:", error);
        _db = null;
      }
    } else {
      console.log("[db] DATABASE_URL not set");
    }
  }
  return _db;
}
