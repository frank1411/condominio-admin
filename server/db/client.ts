import { drizzle } from "drizzle-orm/postgres-js";
import { createLogger } from "../_core/logger";

const log = createLogger("client");
import postgres from "postgres";

import { createLogger } from "../_core/logger";

let _db: ReturnType<typeof drizzle> | null = null;
let _pgClient: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Pool de conexiones explícito con opciones serverless
      _pgClient = postgres(process.env.DATABASE_URL, {
        max: 10,             // máximo 10 conexiones concurrentes
        idle_timeout: 30,    // cerrar conexión idle tras 30s
        connect_timeout: 10, // timeout de conexión 10s
        prepare: false,      // evitar prepared statements persistentes en serverless
        max_lifetime: 60 * 5, // reciclar cada 5 min (evita conexiones stale)
      });
      _db = drizzle(_pgClient);
    } catch (error) {
      log.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
