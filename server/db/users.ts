import { eq, and, desc, asc } from "drizzle-orm";
import { createLogger } from "../_core/logger";
import { InsertUser, apartments, users } from "../../drizzle/schema";
import { getDb } from "./client";
import { getAllApartments, getAllFloors, getCondominiumConfig } from "./condominium";

const log = createLogger("users");

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    log.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === process.env.ADMIN_OPEN_ID) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    log.error({ err: error }, "[Database] Failed to upsert user:");
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    log.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    log.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserFromSupabase(data: {
  email: string;
  name: string;
  supabaseUserId?: string;
  role?: "admin" | "user";
  apartmentId?: number;
}) {
  const db = await getDb();
  if (!db) {
    log.warn("[Database] Cannot create user: database not available");
    return undefined;
  }

  try {
    const insertData: InsertUser = {
      openId: data.supabaseUserId ?? data.email,
      email: data.email,
      name: data.name,
      loginMethod: "supabase",
      role: data.role ?? "user",
      isActive: false,
      approvalStatus: "pending",
      lastSignedIn: new Date(),
      ...(data.apartmentId ? { apartmentId: data.apartmentId } : {}),
    };

    const result = await db.insert(users).values(insertData).returning();
    return result[0];
  } catch (error) {
    log.error({ err: error }, "[Database] Failed to create user from Supabase:");
    return undefined;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function getUsersByRole(role: "admin" | "user") {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(eq(users.role, role));
}

export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq } = await import('drizzle-orm');
  return await db.select().from(users).where(drizzleEq(users.approvalStatus, 'pending'));
}

export async function updateUser(id: number, data: Partial<typeof users.$inferInsert>) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(users).set(data).where(eq(users.id, id));
}


// ===== FUNCIONES PARA NOMBRES DE APARTAMENTOS =====

// Convertir número a letra (1→A, 2→B, 3→C, etc.)
function numberToLetter(num: number): string {
  if (num < 1 || num > 26) return num.toString();
  return String.fromCharCode(64 + num); // 65 es 'A' en ASCII
}

// Función para generar el número de piso inteligente (PB para piso 0, números para otros)
function getSmartFloorNumber(floorNumber: number): string {
  return floorNumber === 0 ? "PB" : floorNumber.toString();
}

export function generateApartmentName(
  pattern: string,
  floorNumber: number,
  floorName: string,
  apartmentNumber: number
): string {
  // Extraer solo el último dígito para la letra (1-6 en lugar de 101-106, 201-206, etc.)
  const lastDigit = apartmentNumber % 10 || (apartmentNumber % 100 === 0 ? 10 : apartmentNumber % 100);
  const letra = numberToLetter(lastDigit);
  const smartFloorNumber = getSmartFloorNumber(floorNumber);
  
  return pattern
    .replace("{piso}", floorNumber.toString())
    .replace("{piso_inteligente}", smartFloorNumber)
    .replace("{piso_nombre}", floorName)
    .replace("{numero}", apartmentNumber.toString())
    .replace("{letra}", letra);
}

// Función para generar ejemplos de patrón
export function generatePatternExamples(pattern: string, floorsCount: number, apartmentsPerFloor: number): string[] {
  const examples: string[] = [];
  const floorNames = ["Planta Baja", ...Array.from({ length: floorsCount - 1 }, (_, i) => `Piso ${i + 1}`)];
  
  // Generar ejemplos de TODOS los pisos
  for (let floorIdx = 0; floorIdx < floorsCount; floorIdx++) {
    // Mostrar primeros 3 apartamentos de cada piso
    for (let aptNum = 1; aptNum <= Math.min(3, apartmentsPerFloor); aptNum++) {
      const example = generateApartmentName(
        pattern,
        floorIdx,
        floorNames[floorIdx],
        aptNum
      );
      examples.push(example);
    }
  }
  
  return examples;
}

export async function generateAllApartmentNames() {
  const db = await getDb();
  if (!db) return null;

  try {
    const config = await getCondominiumConfig();
    if (!config) return null;

    const pattern = config.apartmentNamePattern || "Apt-{piso}-{numero}";
    const allFloors = await getAllFloors();
    const allApartments = await getAllApartments();

    for (const apartment of allApartments) {
      const floor = allFloors.find(f => f.id === apartment.floorId);
      if (floor) {
        const newName = generateApartmentName(
          pattern,
          floor.floorNumber,
          floor.floorName,
          parseInt(apartment.apartmentNumber)
        );
        await db.update(apartments).set({ unitName: newName }).where(eq(apartments.id, apartment.id));
      }
    }

    return { success: true };
  } catch (error) {
    log.error({ err: error }, "Error generating apartment names:");
    return null;
  }
}

export async function updateApartmentName(id: number, name: string) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(apartments).set({ unitName: name }).where(eq(apartments.id, id));
}


// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

export async function changeUserRole(userId: number, newRole: "user" | "admin") {
  const db = await getDb();
  if (!db) return null;
  return await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return await db.delete(users).where(eq(users.id, userId));
}

export async function toggleUserActive(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(users).set({ isActive }).where(eq(users.id, userId));
}