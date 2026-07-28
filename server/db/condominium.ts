import { eq } from "drizzle-orm";
import { createLogger } from "../_core/logger";

const log = createLogger("condominium");
import { apartments, condominiumConfig, floors } from "../../drizzle/schema";
import { getDb } from "./client";

import { createLogger } from "../_core/logger";

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
    const [floor] = await db.insert(floors).values({
      floorNumber: i,
      floorName: floorNames[i] || `Piso ${i}`,
    }).returning({ id: floors.id });
    
    const floorId = floor.id;
    
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
    log.error("Error generating apartment names:", error);
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