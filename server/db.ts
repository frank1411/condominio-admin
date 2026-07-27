import { eq, and, gte, lte, desc, isNull, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { TRPCError } from "@trpc/server";
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
  auditLog,
  notifications
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserFromSupabase(data: { email: string; name: string }) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(users).values({
      openId: `supabase:${data.email}`,
      email: data.email,
      name: data.name,
      loginMethod: "email",
      role: "user",
      approvalStatus: "approved",
      isApproved: true,
      isActive: true,
    }).returning();
    return result[0] ?? null;
  } catch (error) {
    console.warn("[Database] Failed to create user from Supabase:", error);
    return null;
  }
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

export async function createPayment(data: typeof payments.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(payments).values(data);
  return result;
}

export async function getPaymentsByApartment(apartmentId: number, month?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const { eq: drizzleEq, and: drizzleAnd } = await import('drizzle-orm');
  let query = db
    .select({
      id: payments.id,
      userId: payments.userId,
      apartmentId: payments.apartmentId,
      unitName: apartments.unitName,
      month: payments.month,
      voucherNumber: payments.voucherNumber,
      voucherImage: payments.voucherImage,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
    })
    .from(payments)
    .innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id))
    .where(drizzleEq(payments.apartmentId, apartmentId));
  
  if (month) {
    query = db
      .select({
        id: payments.id,
        userId: payments.userId,
        apartmentId: payments.apartmentId,
        unitName: apartments.unitName,
        month: payments.month,
        voucherNumber: payments.voucherNumber,
        voucherImage: payments.voucherImage,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id))
      .where(drizzleAnd(drizzleEq(payments.apartmentId, apartmentId), drizzleEq(payments.month, month)));
  }
  
  return await query;
}

export async function getPendingPayments(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { eq: drizzleEq, desc } = await import('drizzle-orm');
  
  try {
    const data = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        apartmentId: payments.apartmentId,
        unitName: apartments.unitName,
        month: payments.month,
        voucherNumber: payments.voucherNumber,
        voucherImage: payments.voucherImage,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id))
      .where(drizzleEq(payments.status, "pending"))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
    
    return { data, total: data.length };
  } catch (error) {
    console.error("[Payments] Error fetching pending payments:", error);
    return { data: [], total: 0 };
  }
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
    })
    .from(monthlyDebts)
    .innerJoin(apartments, drizzleEq(monthlyDebts.apartmentId, apartments.id))
    .where(drizzleEq(monthlyDebts.apartmentId, user.apartmentId));
  return result;
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
    console.error("Error generating apartment names:", error);
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


// ============================================
// DEBT GENERATION FUNCTIONS
// ============================================
export async function generateDebtsFromCharge(chargeId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Obtener el cobro
    const charge = await db.select().from(charges).where(eq(charges.id, chargeId)).limit(1);
    if (!charge || charge.length === 0) {
      console.error(`[Debt Generation] Charge ${chargeId} not found`);
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
    }

    console.log(`[Debt Generation] Successfully generated debts for charge ${chargeId}`);
  } catch (error) {
    console.error(`[Debt Generation] Error generating debts for charge ${chargeId}:`, error);
  }
}


export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  const result = await db
    .select()
    .from(payments)
    .where(drizzleEq(payments.id, id));
  
  return result.length > 0 ? result[0] : null;
}

export async function applyPaymentToDebts(
  apartmentId: number,
  paymentAmount: number,
  tx?: any
) {
  const db = tx ?? await getDb();
  if (!db) return null;
  
  const { eq: drizzleEq, and } = await import('drizzle-orm');
  
  try {
    // Buscar deudas pendientes del apartamento (ordenadas por mes más antiguo primero)
    const pendingDebts = await db
      .select()
      .from(monthlyDebts)
      .where(and(
        drizzleEq(monthlyDebts.apartmentId, apartmentId),
        drizzleEq(monthlyDebts.isPaid, false)
      ))
      .orderBy(monthlyDebts.month);
    
    let remainingPayment = paymentAmount;
    let appliedTotal = 0;
    
    for (const debt of pendingDebts) {
      if (remainingPayment <= 0) break;
      
      const debtAmount = parseFloat(debt.pendingAmount as unknown as string);
      const currentPaid = parseFloat(debt.totalPaid as unknown as string) || 0;
      
      if (remainingPayment >= debtAmount) {
        // El pago cubre completamente esta deuda
        remainingPayment -= debtAmount;
        appliedTotal += debtAmount;
        
        await db.update(monthlyDebts)
          .set({
            pendingAmount: "0.00",
            totalPaid: debt.totalDue,
            isPaid: true,
          })
          .where(drizzleEq(monthlyDebts.id, debt.id));
      } else if (remainingPayment > 0) {
        // El pago es parcial
        const newPending = (debtAmount - remainingPayment).toFixed(2);
        const newPaid = (currentPaid + remainingPayment).toFixed(2);
        
        appliedTotal += remainingPayment;
        
        await db.update(monthlyDebts)
          .set({
            pendingAmount: newPending,
            totalPaid: newPaid,
          })
          .where(drizzleEq(monthlyDebts.id, debt.id));
        
        remainingPayment = 0;
      }
    }
    
    return { success: true, appliedAmount: appliedTotal };
  } catch (error) {
    console.error("[Payment Liquidation] Error applying payment to debts:", error);
    return { success: false, appliedAmount: 0 };
  }
}


// ===== FASE 1: TRANSACCIONES ACID Y VALIDACIONES =====

/**
 * Validar que el monto del pago no exceda la deuda pendiente total del apartamento
 */
export async function validatePaymentAmount(
  apartmentId: number,
  paymentAmount: number,
  tx?: any
): Promise<{ valid: boolean; reason?: string }> {
  const db = tx ?? await getDb();
  if (!db) return { valid: false, reason: "Base de datos no disponible" };
  
  const { eq: drizzleEq, and } = await import('drizzle-orm');
  
  try {
    // Obtener deudas pendientes del apartamento
    const pendingDebts = await db
      .select()
      .from(monthlyDebts)
      .where(and(
        drizzleEq(monthlyDebts.apartmentId, apartmentId),
        drizzleEq(monthlyDebts.isPaid, false)
      ));
    
    // Calcular deuda total pendiente
    const totalPending = pendingDebts.reduce((sum, debt) => {
      const pending = parseFloat(debt.pendingAmount as unknown as string) || 0;
      return sum + pending;
    }, 0);
    
    if (paymentAmount > totalPending + 0.01) { // Permitir pequeños errores de redondeo
      return {
        valid: false,
        reason: `El monto del pago ($${paymentAmount.toFixed(2)}) excede la deuda pendiente ($${totalPending.toFixed(2)})`
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error("[Payment Validation] Error validating payment amount:", error);
    return { valid: false, reason: "Error al validar el monto" };
  }
}

/**
 * Verificar si ya existe un pago aprobado para el mismo mes y apartamento
 */
export async function checkDuplicatePayment(apartmentId: number, month: string, excludePaymentId?: number): Promise<{ isDuplicate: boolean; existingPaymentId?: number }> {
  const db = await getDb();
  if (!db) return { isDuplicate: false };
  
  const { eq: drizzleEq, and, ne } = await import('drizzle-orm');
  
  try {
    let query = db
      .select()
      .from(payments)
      .where(and(
        drizzleEq(payments.apartmentId, apartmentId),
        drizzleEq(payments.month, month),
        drizzleEq(payments.status, "approved")
      ));
    
    // Si se proporciona un ID de pago, excluirlo de la búsqueda
    if (excludePaymentId) {
      query = db
        .select()
        .from(payments)
        .where(and(
          drizzleEq(payments.apartmentId, apartmentId),
          drizzleEq(payments.month, month),
          drizzleEq(payments.status, "approved"),
          ne(payments.id, excludePaymentId)
        ));
    }
    
    const result = await query;
    
    if (result.length > 0) {
      return { isDuplicate: true, existingPaymentId: result[0].id };
    }
    
    return { isDuplicate: false };
  } catch (error) {
    console.error("[Payment Validation] Error checking duplicate payment:", error);
    return { isDuplicate: false };
  }
}

/**
 * Validar que la fecha del pago no sea de un mes futuro
 */
export function validatePaymentMonth(paymentMonth: string): { valid: boolean; reason?: string } {
  try {
    // Validar formato YYYY-MM
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(paymentMonth)) {
      return {
        valid: false,
        reason: "Formato de mes inválido. Use YYYY-MM"
      };
    }
    
    const [year, month] = paymentMonth.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // Validar rango de mes
    if (monthNum < 1 || monthNum > 12) {
      return {
        valid: false,
        reason: "Mes inválido. Debe estar entre 01 y 12"
      };
    }
    
    // Validar que el año sea razonable (no demasiado antiguo ni futuro)
    const today = new Date();
    if (yearNum < today.getFullYear() - 10) {
      return {
        valid: false,
        reason: "Mes muy antiguo. Debe estar dentro de los últimos 10 años"
      };
    }
    
    if (yearNum > today.getFullYear() + 1) {
      return {
        valid: false,
        reason: "Año inválido. No se pueden cargar pagos demasiado en el futuro"
      };
    }
    
    // Permitir pagos parciales del mismo mes y meses anteriores
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: "Formato de mes inválido. Use YYYY-MM"
    };
  }
}

/**
 * Función mejorada de aprobación de pago con validaciones y transacciones ACID
 * Ejecuta todas las operaciones de forma atómica
 */
export async function approvePaymentWithValidations(
  paymentId: number,
  reviewedBy: number,
  notes?: string
): Promise<{
  success: boolean;
  message: string;
  appliedAmount?: number;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Base de datos no disponible" };
  }
  
  try {
    // Transacción ACID: todo o nada con bloqueo de fila
    return await db.transaction(async (tx) => {
      // 1. SELECT ... FOR UPDATE — bloquea la fila del pago
      const [payment]: typeof payments.$inferSelect[] = await tx.execute(
        sql`SELECT * FROM payments WHERE id = ${paymentId} FOR UPDATE`
      );

      if (!payment) {
        return { success: false, message: "Pago no encontrado" };
      }

      const paymentAmount = parseFloat(payment.amount as unknown as string);

      // 2. Validar mes del pago
      const monthValidation = validatePaymentMonth(payment.month);
      if (!monthValidation.valid) {
        return { success: false, message: monthValidation.reason || "Fecha inválida" };
      }

      // 3. Validar que el monto no exceda la deuda pendiente (dentro de la tx)
      const amountValidation = await validatePaymentAmount(payment.apartmentId, paymentAmount, tx);
      if (!amountValidation.valid) {
        return { success: false, message: amountValidation.reason || "Monto inválido" };
      }

      // 4. Actualizar estado del pago
      await tx.update(payments)
        .set({
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy,
          notes: notes || null,
        })
        .where(eq(payments.id, paymentId));

      // 5. Aplicar liquidación de deudas (dentro de la misma tx)
      const liquidationResult = await applyPaymentToDebts(payment.apartmentId, paymentAmount, tx);

      if (!liquidationResult || !liquidationResult.success) {
        // La tx.rollback() ocurre automáticamente si lanzamos un error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al liquidar las deudas — transacción revertida",
        });
      }

      // 6. Crear log de auditoría
      await tx.insert(auditLog).values({
        userId: reviewedBy,
        action: "approve_payment",
        entityType: "payment",
        entityId: paymentId,
        details: `Pago aprobado: $${paymentAmount.toFixed(2)} - ${notes || "Sin notas"}`,
      });

      return {
        success: true,
        message: "Pago aprobado exitosamente",
        appliedAmount: liquidationResult?.appliedAmount,
      };
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      return { success: false, message: error.message };
    }
    console.error("[Payment Approval] Error approving payment:", error);
    return { success: false, message: "Error al aprobar el pago" };
  }
}


// ===== FASE 3: NOTIFICACIONES =====

/**
 * Crear una notificación para un usuario
 */
export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    return await db.insert(notifications).values(data);
  } catch (error) {
    console.error("[Notifications] Error creating notification:", error);
    return null;
  }
}

/**
 * Obtener notificaciones no leídas de un usuario
 */
export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  
  try {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          drizzleEq(notifications.userId, userId),
          drizzleEq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.error("[Notifications] Error getting unread notifications:", error);
    return [];
  }
}

/**
 * Obtener todas las notificaciones de un usuario
 */
export async function getUserNotifications(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  
  try {
    return await db
      .select()
      .from(notifications)
      .where(drizzleEq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Notifications] Error getting user notifications:", error);
    return [];
  }
}

/**
 * Marcar una notificación como leída
 */
export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  
  try {
    return await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(drizzleEq(notifications.id, notificationId));
  } catch (error) {
    console.error("[Notifications] Error marking notification as read:", error);
    return null;
  }
}

/**
 * Marcar todas las notificaciones de un usuario como leídas
 */
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { eq: drizzleEq } = await import('drizzle-orm');
  
  try {
    return await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          drizzleEq(notifications.userId, userId),
          drizzleEq(notifications.isRead, false)
        )
      );
  } catch (error) {
    console.error("[Notifications] Error marking all notifications as read:", error);
    return null;
  }
}

/**
 * Contar notificaciones no leídas de un usuario
 */
export async function countUnreadNotifications(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const { eq: drizzleEq, sql } = await import('drizzle-orm');
  
  try {
    const result = await db
      .select({ count: sql`COUNT(*)` })
      .from(notifications)
      .where(
        and(
          drizzleEq(notifications.userId, userId),
          drizzleEq(notifications.isRead, false)
        )
      );
    
    return parseInt(result[0]?.count as string) || 0;
  } catch (error) {
    console.error("[Notifications] Error counting unread notifications:", error);
    return 0;
  }
}

/**
 * Notificar al usuario cuando su pago es aprobado
 */
export async function notifyPaymentApproved(userId: number, paymentId: number, amount: string, currency: string) {
  return createNotification({
    userId,
    type: "payment_approved",
    title: "Pago Aprobado",
    message: `Tu pago de ${currency} ${parseFloat(amount).toFixed(2)} ha sido aprobado exitosamente.`,
    relatedEntityType: "payment",
    relatedEntityId: paymentId,
    actionUrl: `/user/payments/${paymentId}`,
  });
}

/**
 * Notificar al usuario cuando su pago es rechazado
 */
export async function notifyPaymentRejected(userId: number, paymentId: number, reason: string) {
  return createNotification({
    userId,
    type: "payment_rejected",
    title: "Pago Rechazado",
    message: `Tu pago ha sido rechazado. Razón: ${reason}`,
    relatedEntityType: "payment",
    relatedEntityId: paymentId,
    actionUrl: `/user/payments/${paymentId}`,
  });
}

/**
 * Notificar al admin cuando hay un nuevo pago pendiente
 */
export async function notifyAdminNewPayment(adminId: number, paymentId: number, apartmentName: string, amount: string, currency: string) {
  return createNotification({
    userId: adminId,
    type: "payment_received",
    title: "Nuevo Pago Pendiente de Revisión",
    message: `Se ha recibido un pago de ${currency} ${parseFloat(amount).toFixed(2)} del apartamento ${apartmentName}.`,
    relatedEntityType: "payment",
    relatedEntityId: paymentId,
    actionUrl: `/admin/payments`,
  });
}

/**
 * Notificar al usuario cuando se genera una nueva deuda
 */
export async function notifyNewDebt(userId: number, apartmentId: number, month: string, amount: string, currency: string) {
  return createNotification({
    userId,
    type: "debt_created",
    title: "Nueva Deuda Registrada",
    message: `Se ha registrado una deuda de ${currency} ${parseFloat(amount).toFixed(2)} para el mes de ${month}.`,
    relatedEntityType: "debt",
    relatedEntityId: apartmentId,
    actionUrl: `/user/debts`,
  });
}

/**
 * Notificar al usuario cuando su deuda es pagada
 */
export async function notifyDebtPaid(userId: number, apartmentId: number, month: string, amount: string, currency: string) {
  return createNotification({
    userId,
    type: "debt_paid",
    title: "Deuda Pagada",
    message: `Tu deuda de ${currency} ${parseFloat(amount).toFixed(2)} para el mes de ${month} ha sido pagada.`,
    relatedEntityType: "debt",
    relatedEntityId: apartmentId,
    actionUrl: `/user/debts`,
  });
}


// ===== FASE 4: ALMACENAMIENTO S3 =====

/**
 * Subir comprobante de pago a S3
 */
export async function uploadPaymentVoucher(
  paymentId: number,
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  mimeType: string
) {
  const { storagePut } = await import("./storage");
  
  try {
    // Validar tipo MIME
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
    }

    // Validar tamaño máximo (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileBuffer.length > maxSize) {
      throw new Error(`Archivo muy grande. Máximo: 5MB`);
    }

    // Generar clave única en S3
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const extension = getFileExtension(mimeType);
    const s3Key = `payments/${paymentId}/${timestamp}-${randomSuffix}.${extension}`;

    // Subir a S3
    const { url, key } = await storagePut(s3Key, fileBuffer, mimeType);

    // Guardar URL y clave en BD
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    await db
      .update(payments)
      .set({
        voucherImageUrl: url,
        voucherImageKey: key,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    return { url, key };
  } catch (error) {
    console.error("[S3] Error uploading voucher:", error);
    throw error;
  }
}

/**
 * Obtener URL del comprobante de pago
 */
export async function getPaymentVoucherUrl(paymentId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  
  try {
    const payment = await db
      .select({ voucherImageUrl: payments.voucherImageUrl })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    return payment[0]?.voucherImageUrl || null;
  } catch (error) {
    console.error("[S3] Error getting voucher URL:", error);
    return null;
  }
}

/**
 * Eliminar comprobante de pago de S3
 */
export async function deletePaymentVoucher(paymentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  
  try {
    // Obtener clave del archivo
    const payment = await db
      .select({ voucherImageKey: payments.voucherImageKey })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment[0]?.voucherImageKey) {
      return true; // No hay archivo que eliminar
    }

    // TODO: Implementar eliminación en S3 cuando la API lo permita
    // Por ahora solo limpiamos la BD

    // Limpiar referencias en BD
    await db
      .update(payments)
      .set({
        voucherImageUrl: null,
        voucherImageKey: null,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    return true;
  } catch (error) {
    console.error("[S3] Error deleting voucher:", error);
    return false;
  }
}

/**
 * Obtener extension de archivo basada en MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return mimeToExt[mimeType] || "bin";
}


// ===== FASE 5: REPORTES =====

/**
 * Obtener datos para reporte mensual de un apartamento
 */
export async function getMonthlyReportData(apartmentId: number, month: string) {
  const db = await getDb();
  if (!db) return null;


  try {
    // Obtener información del apartamento
    const apartment = await db
      .select()
      .from(apartments)
      .where(eq(apartments.id, apartmentId))
      .limit(1);

    if (!apartment[0]) return null;

    // Obtener pagos del mes
    const monthPayments = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.apartmentId, apartmentId),
          eq(payments.month, month)
        )
      );

    // Obtener deudas del mes
    const monthDebts = await db
      .select()
      .from(monthlyDebts)
      .where(
        and(
          eq(monthlyDebts.apartmentId, apartmentId),
          eq(monthlyDebts.month, month)
        )
      );

    // Obtener configuración del condominio
    const config = await getCondominiumConfig();

    return {
      apartment: apartment[0],
      payments: monthPayments,
      debts: monthDebts,
      config,
      month,
    };
  } catch (error) {
    console.error("[Reports] Error getting monthly report data:", error);
    return null;
  }
}

/**
 * Obtener resumen de pagos y deudas para un usuario
 */
export async function getUserPaymentsSummary(userId: number, limit: number = 12) {
  const db = await getDb();
  if (!db) return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };


  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0] || !user[0].apartmentId) {
      return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
    }

    // Obtener últimos pagos
    const userPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.apartmentId, user[0].apartmentId))
      .orderBy(desc(payments.submittedAt))
      .limit(limit);

    // Obtener deudas pendientes
    const userDebts = await db
      .select()
      .from(monthlyDebts)
      .where(
        and(
          eq(monthlyDebts.apartmentId, user[0].apartmentId),
          eq(monthlyDebts.isPaid, false)
        )
      )
      .orderBy(asc(monthlyDebts.month));

    // Calcular totales
    const totalPaid = userPayments
      .filter(p => p.status === "approved")
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

    const totalPending = userDebts.reduce((sum, d) => sum + parseFloat(d.pendingAmount || "0"), 0);

    return {
      payments: userPayments,
      debts: userDebts,
      totalPaid: totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2),
    };
  } catch (error) {
    console.error("[Reports] Error getting user payments summary:", error);
    return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
  }
}

/**
 * Obtener reporte de deudas totales por mes (para admin)
 */
export async function getMonthlyDebtsSummary(month: string) {
  const db = await getDb();
  if (!db) return [];


  try {
    return await db
      .select()
      .from(monthlyDebts)
      .where(eq(monthlyDebts.month, month))
      .orderBy(desc(monthlyDebts.pendingAmount));
  } catch (error) {
    console.error("[Reports] Error getting monthly debts summary:", error);
    return [];
  }
}

/**
 * Obtener reporte de pagos por estado (para admin)
 */
export async function getPaymentsByStatus(status: "pending" | "approved" | "rejected", month?: string) {
  const db = await getDb();
  if (!db) return [];


  try {
    let query = db
      .select()
      .from(payments)
      .where(eq(payments.status, status));

    if (month) {
      query = db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.status, status),
            eq(payments.month, month)
          )
        );
    }

    return await query.orderBy(desc(payments.submittedAt));
  } catch (error) {
    console.error("[Reports] Error getting payments by status:", error);
    return [];
  }
}

/**
 * Generar reporte en formato JSON para exportar
 */
export async function generateReportJSON(apartmentId: number, month: string) {
  const reportData = await getMonthlyReportData(apartmentId, month);
  if (!reportData) return null;

  return {
    generatedAt: new Date().toISOString(),
    apartment: {
      id: reportData.apartment.id,
      number: reportData.apartment.apartmentNumber,
      name: reportData.apartment.unitName,
    },
    month: reportData.month,
    payments: reportData.payments.map(p => ({
      id: p.id,
      voucherNumber: p.voucherNumber,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt,
    })),
    debts: reportData.debts.map(d => ({
      id: d.id,
      month: d.month,
      totalDue: d.totalDue,
      pendingAmount: d.pendingAmount,
      isPaid: d.isPaid,
      createdAt: d.createdAt,
    })),
    summary: {
      totalPayments: reportData.payments.length,
      approvedPayments: reportData.payments.filter(p => p.status === "approved").length,
      totalDebts: reportData.debts.length,
      paidDebts: reportData.debts.filter(d => d.isPaid).length,
      totalAmount: reportData.debts.reduce((sum, d) => sum + parseFloat(d.totalDue || "0"), 0).toFixed(2),
      totalPending: reportData.debts.reduce((sum, d) => sum + parseFloat(d.pendingAmount || "0"), 0).toFixed(2),
    },
  };
}


/**
 * Obtener TODAS las deudas pendientes de un apartamento (sin importar el mes)
 * Retorna true si existe al menos una deuda sin pagar
 */
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
