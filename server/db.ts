import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  condominiumConfig,
  floors,
  apartments,
  charges,
  payments,
  monthlyDebts,
  reminders,
  auditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
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
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCondominiumConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(condominiumConfig).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateCondominiumConfig(data: Partial<typeof condominiumConfig.$inferInsert>) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.update(condominiumConfig).set(data).where(eq(condominiumConfig.id, 1));
  return result;
}

export async function initializeCondominiumConfig() {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getCondominiumConfig();
  if (existing) return existing;
  
  await db.insert(condominiumConfig).values({
    id: 1,
    name: "Mi Condominio",
    floors: 5,
    apartmentsPerFloor: 6,
    baseFee: "100.00",
    defaultCurrency: "USD",
    exchangeRate: "2600.0000",
    reminderDay: 5,
  });
  
  return await getCondominiumConfig();
}

export async function initializeFloorsAndApartments() {
  const db = await getDb();
  if (!db) return;

  const config = await getCondominiumConfig();
  if (!config) return;

  const existingFloors = await db.select().from(floors);
  if (existingFloors.length > 0) return;

  const floorNames = ["Planta Baja", "Piso 1", "Piso 2", "Piso 3", "Piso 4"];
  const numFloors = config.floors || 5;
  const numApartments = config.apartmentsPerFloor || 6;
  
  for (let i = 0; i < numFloors; i++) {
    const floorResult = await db.insert(floors).values({
      floorNumber: i,
      floorName: floorNames[i] || `Piso ${i}`,
    });
    
    const floorId = (floorResult as any).insertId;
    
    for (let j = 1; j <= numApartments; j++) {
      const apartmentNumber = `${i}${String(j).padStart(2, "0")}`;
      await db.insert(apartments).values({
        floorId: floorId,
        apartmentNumber: apartmentNumber,
        unitName: `Apt. ${apartmentNumber}`,
      });
    }
  }
}

export async function getAllFloors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(floors);
}

export async function getAllApartments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(apartments);
}

export async function getApartmentsByFloor(floorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(apartments).where(eq(apartments.floorId, floorId));
}

export async function getAllCharges() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(charges).where(eq(charges.isActive, true));
}

export async function createCharge(data: typeof charges.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(charges).values(data);
  return result;
}

export async function updateCharge(id: number, data: Partial<typeof charges.$inferInsert>) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(charges).set(data).where(eq(charges.id, id));
}

export async function deleteCharge(id: number) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(charges).set({ isActive: false }).where(eq(charges.id, id));
}

export async function createPayment(data: typeof payments.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(payments).values(data);
  return result;
}

export async function getPaymentsByApartment(apartmentId: number, month?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(payments).where(eq(payments.apartmentId, apartmentId));
  
  if (month) {
    query = db.select().from(payments).where(
      and(eq(payments.apartmentId, apartmentId), eq(payments.month, month))
    );
  }
  
  return await query;
}

export async function getPendingPayments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(payments).where(eq(payments.status, "pending"));
}

export async function updatePaymentStatus(id: number, status: "approved" | "rejected", reviewedBy: number, notes?: string) {
  const db = await getDb();
  if (!db) return null;
  
  const data: any = {
    status,
    reviewedAt: new Date(),
    reviewedBy,
  };
  
  if (notes) {
    data.notes = notes;
  }
  
  return await db.update(payments).set(data).where(eq(payments.id, id));
}

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
  return await db.select().from(monthlyDebts).where(eq(monthlyDebts.month, month));
}

export async function getAllUserDebts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const user = await getUserById(userId);
  if (!user || !user.apartmentId) return [];
  
  return await db.select().from(monthlyDebts).where(eq(monthlyDebts.apartmentId, user.apartmentId));
}

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

export async function createAuditLog(data: typeof auditLog.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  return await db.insert(auditLog).values(data);
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
  return await db.select().from(users).where(eq(users.isApproved, false));
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

export function generateApartmentName(
  pattern: string,
  floorNumber: number,
  floorName: string,
  apartmentNumber: number
): string {
  const letra = numberToLetter(apartmentNumber);
  return pattern
    .replace("{piso}", floorNumber.toString())
    .replace("{piso_nombre}", floorName)
    .replace("{numero}", apartmentNumber.toString())
    .replace("{letra}", letra);
}

// Función para generar ejemplos de patrón
export function generatePatternExamples(pattern: string, floorsCount: number, apartmentsPerFloor: number): string[] {
  const examples: string[] = [];
  const floorNames = ["Planta Baja", ...Array.from({ length: floorsCount - 1 }, (_, i) => `Piso ${i + 1}`)];
  
  // Generar ejemplos de los primeros 3 pisos
  for (let floorIdx = 0; floorIdx < Math.min(3, floorsCount); floorIdx++) {
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
    console.error("Error generating apartment names:", error);
    return null;
  }
}

export async function updateApartmentName(id: number, name: string) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(apartments).set({ unitName: name }).where(eq(apartments.id, id));
}
