import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { monthlyDebts } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Pruebas para Fase 11: Corrección del Bug del Dashboard
 * 
 * El bug: El dashboard mostraba "Pagado" para apartamentos que tenían
 * deudas individuales de otros meses, porque solo verificaba deudas del mes actual.
 * 
 * La solución: Nueva función hasAnyPendingDebt que verifica TODAS las deudas
 * pendientes de un apartamento, sin importar el mes.
 */

describe("FASE 11: Corrección del Bug del Dashboard", () => {
  let testApartmentId: number;

  beforeAll(async () => {
    // Crear apartamento de prueba
    const apartmentsList = await db.getAllApartments();
    testApartmentId = apartmentsList[0]?.id || 1;
  });

  describe("hasAnyPendingDebt", () => {
    it("debe retornar false si no hay deudas pendientes", async () => {
      // Limpiar deudas pendientes del apartamento
      const drizzleDb = await db.getDb();
      if (drizzleDb) {
        await drizzleDb.update(monthlyDebts)
          .set({ isPaid: true })
          .where(eq(monthlyDebts.apartmentId, testApartmentId));
      }

      const hasPending = await db.hasAnyPendingDebt(testApartmentId);
      expect(hasPending).toBe(false);
    });

    it("debe retornar true si hay deuda pendiente en el mes actual", async () => {
      // Crear deuda pendiente en el mes actual
      const currentMonth = new Date().toISOString().slice(0, 7);
      const drizzleDb = await db.getDb();
      
      if (drizzleDb) {
        await drizzleDb.insert(monthlyDebts).values({
          apartmentId: testApartmentId,
          month: currentMonth,
          totalDue: "100.00",
          pendingAmount: "50.00",
          isPaid: false,
          chargeId: null
        });

        const hasPending = await db.hasAnyPendingDebt(testApartmentId);
        expect(hasPending).toBe(true);

        // Limpiar
        await drizzleDb.delete(monthlyDebts)
          .where(and(
            eq(monthlyDebts.apartmentId, testApartmentId),
            eq(monthlyDebts.month, currentMonth),
            eq(monthlyDebts.totalDue, "100.00")
          ));
      }
    });

    it("debe retornar true si hay deuda pendiente en mes anterior", async () => {
      // Crear deuda pendiente en mes anterior
      const pastMonth = new Date();
      pastMonth.setMonth(pastMonth.getMonth() - 1);
      const pastMonthStr = pastMonth.toISOString().slice(0, 7);
      
      const drizzleDb = await db.getDb();
      if (drizzleDb) {
        await drizzleDb.insert(monthlyDebts).values({
          apartmentId: testApartmentId,
          month: pastMonthStr,
          totalDue: "75.00",
          pendingAmount: "75.00",
          isPaid: false,
          chargeId: null
        });

        const hasPending = await db.hasAnyPendingDebt(testApartmentId);
        expect(hasPending).toBe(true);

        // Limpiar
        await drizzleDb.delete(monthlyDebts)
          .where(and(
            eq(monthlyDebts.apartmentId, testApartmentId),
            eq(monthlyDebts.month, pastMonthStr),
            eq(monthlyDebts.totalDue, "75.00")
          ));
      }
    });

    it("debe retornar true incluso si solo hay deuda parcial", async () => {
      // Crear deuda con pendingAmount > 0
      const currentMonth = new Date().toISOString().slice(0, 7);
      const drizzleDb = await db.getDb();
      
      if (drizzleDb) {
        await drizzleDb.insert(monthlyDebts).values({
          apartmentId: testApartmentId,
          month: currentMonth,
          totalDue: "100.00",
          pendingAmount: "0.01",
          isPaid: false,
          chargeId: null
        });

        const hasPending = await db.hasAnyPendingDebt(testApartmentId);
        expect(hasPending).toBe(true);

        // Limpiar
        await drizzleDb.delete(monthlyDebts)
          .where(and(
            eq(monthlyDebts.apartmentId, testApartmentId),
            eq(monthlyDebts.month, currentMonth),
            eq(monthlyDebts.totalDue, "100.00")
          ));
      }
    });

    it("debe retornar false si todas las deudas están pagadas", async () => {
      // Crear deuda pero marcarla como pagada
      const currentMonth = new Date().toISOString().slice(0, 7);
      const drizzleDb = await db.getDb();
      
      if (drizzleDb) {
        await drizzleDb.insert(monthlyDebts).values({
          apartmentId: testApartmentId,
          month: currentMonth,
          totalDue: "100.00",
          pendingAmount: "0.00",
          isPaid: true,
          chargeId: null
        });

        const hasPending = await db.hasAnyPendingDebt(testApartmentId);
        expect(hasPending).toBe(false);

        // Limpiar
        await drizzleDb.delete(monthlyDebts)
          .where(and(
            eq(monthlyDebts.apartmentId, testApartmentId),
            eq(monthlyDebts.month, currentMonth),
            eq(monthlyDebts.totalDue, "100.00")
          ));
      }
    });
  });

  describe("Dashboard Status Logic", () => {
    it("debe mostrar 'Pendiente' si hay deuda individual aunque deuda colectiva esté pagada", async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const drizzleDb = await db.getDb();
      
      if (drizzleDb) {
        // Crear deuda colectiva pagada
        await drizzleDb.insert(monthlyDebts).values({
          apartmentId: testApartmentId,
          month: currentMonth,
          totalDue: "50.00",
          pendingAmount: "0.00",
          isPaid: true,
          chargeId: null
        });

        // Crear deuda individual pendiente de otro mes
        const pastMonth = new Date();
        pastMonth.setMonth(pastMonth.getMonth() - 1);
        const pastMonthStr = pastMonth.toISOString().slice(0, 7);
        
        await drizzleDb.insert(monthlyDebts).values({
          apartmentId: testApartmentId,
          month: pastMonthStr,
          totalDue: "25.00",
          pendingAmount: "25.00",
          isPaid: false,
          chargeId: null
        });

        // Verificar que hasAnyPendingDebt retorna true
        const hasPending = await db.hasAnyPendingDebt(testApartmentId);
        expect(hasPending).toBe(true);

        // Limpiar
        await drizzleDb.delete(monthlyDebts)
          .where(eq(monthlyDebts.apartmentId, testApartmentId));
      }
    });

    it("debe mostrar 'Pagado' solo si NO hay deudas pendientes en ningún mes", async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const pastMonth = new Date();
      pastMonth.setMonth(pastMonth.getMonth() - 1);
      const pastMonthStr = pastMonth.toISOString().slice(0, 7);
      
      const drizzleDb = await db.getDb();
      if (drizzleDb) {
        // Crear deudas pagadas en múltiples meses
        await drizzleDb.insert(monthlyDebts).values({
          apartmentId: testApartmentId,
          month: currentMonth,
          totalDue: "50.00",
          pendingAmount: "0.00",
          isPaid: true,
          chargeId: null
        });

        await drizzleDb.insert(monthlyDebts).values({
          apartmentId: testApartmentId,
          month: pastMonthStr,
          totalDue: "25.00",
          pendingAmount: "0.00",
          isPaid: true,
          chargeId: null
        });

        // Verificar que hasAnyPendingDebt retorna false
        const hasPending = await db.hasAnyPendingDebt(testApartmentId);
        expect(hasPending).toBe(false);

        // Limpiar
        await drizzleDb.delete(monthlyDebts)
          .where(eq(monthlyDebts.apartmentId, testApartmentId));
      }
    });
  });

  afterAll(async () => {
    // Limpiar cualquier dato de prueba
    const drizzleDb = await db.getDb();
    if (drizzleDb) {
      await drizzleDb.delete(monthlyDebts)
        .where(eq(monthlyDebts.apartmentId, testApartmentId));
    }
  });
});
