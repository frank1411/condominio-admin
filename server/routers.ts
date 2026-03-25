import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

// Procedimiento solo para administradores
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden acceder" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== CONFIGURACIÓN DEL CONDOMINIO =====
  config: router({
    get: publicProcedure.query(async () => {
      const config = await db.getCondominiumConfig();
      if (!config) {
        return await db.initializeCondominiumConfig();
      }
      return config;
    }),

    update: adminProcedure
      .input(z.object({
        name: z.string().optional(),
        floors: z.number().min(1).max(20).optional(),
        apartmentsPerFloor: z.number().min(1).max(50).optional(),
        baseFee: z.string().optional(),
        defaultCurrency: z.enum(["USD", "VES"]).optional(),
        exchangeRate: z.string().optional(),
        reminderDay: z.number().min(1).max(28).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.updateCondominiumConfig(input);
        return await db.getCondominiumConfig();
      }),

    initializeStructure: adminProcedure.mutation(async () => {
      await db.initializeFloorsAndApartments();
      return { success: true };
    }),
  }),

  // ===== GESTIÓN DE PISOS Y APARTAMENTOS =====
  floors: router({
    list: publicProcedure.query(async () => {
      return await db.getAllFloors();
    }),

    withApartments: publicProcedure.query(async () => {
      const floors = await db.getAllFloors();
      const apartments = await db.getAllApartments();
      
      return floors.map(floor => ({
        ...floor,
        apartments: apartments.filter(apt => apt.floorId === floor.id),
      }));
    }),
  }),

  apartments: router({
    list: publicProcedure.query(async () => {
      return await db.getAllApartments();
    }),

    byFloor: publicProcedure
      .input(z.object({ floorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getApartmentsByFloor(input.floorId);
      }),
  }),

  // ===== GESTIÓN DE COBROS =====
  charges: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCharges();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        amount: z.string(),
        currency: z.enum(["USD", "VES"]).default("USD"),
        isRecurring: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createCharge({
          name: input.name,
          description: input.description,
          amount: input.amount,
          currency: input.currency,
          isRecurring: input.isRecurring,
          isActive: true,
        });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        amount: z.string().optional(),
        currency: z.enum(["USD", "VES"]).optional(),
        isRecurring: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCharge(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCharge(input.id);
        return { success: true };
      }),
  }),

  // ===== GESTIÓN DE PAGOS =====
  payments: router({
    submit: protectedProcedure
      .input(z.object({
        month: z.string(), // "2026-03"
        voucherNumber: z.string().optional(),
        voucherImage: z.string().optional(), // Base64
        amount: z.string(),
        currency: z.enum(["USD", "VES"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user.apartmentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Usuario no tiene apartamento asignado" });
        }

        const result = await db.createPayment({
          userId: ctx.user.id,
          apartmentId: ctx.user.apartmentId,
          month: input.month,
          voucherNumber: input.voucherNumber,
          voucherImage: input.voucherImage,
          amount: input.amount,
          currency: input.currency,
          status: "pending",
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "submit_payment",
          entityType: "payment",
          details: `Pago enviado para ${input.month}`,
        });

        return { success: true };
      }),

    pending: adminProcedure.query(async () => {
      return await db.getPendingPayments();
    }),

    approve: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updatePaymentStatus(input.id, "approved", ctx.user.id, input.notes);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "approve_payment",
          entityType: "payment",
          entityId: input.id,
          details: input.notes || "Pago aprobado",
        });

        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updatePaymentStatus(input.id, "rejected", ctx.user.id, input.notes);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "reject_payment",
          entityType: "payment",
          entityId: input.id,
          details: input.notes,
        });

        return { success: true };
      }),

    byApartment: protectedProcedure
      .input(z.object({
        apartmentId: z.number(),
        month: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPaymentsByApartment(input.apartmentId, input.month);
      }),

    myPayments: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.apartmentId) return [];
      return await db.getPaymentsByApartment(ctx.user.apartmentId);
    }),
  }),

  // ===== GESTIÓN DE DEUDAS =====
  debts: router({
    getByMonth: adminProcedure
      .input(z.object({ month: z.string() }))
      .query(async ({ input }) => {
        return await db.getDebtsByMonth(input.month);
      }),

    myDebts: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAllUserDebts(ctx.user.id);
    }),

    dashboard: adminProcedure.query(async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const debts = await db.getDebtsByMonth(currentMonth);
      
      return {
        currentMonth,
        debts,
        summary: {
          total: debts.length,
          paid: debts.filter(d => d.isPaid).length,
          pending: debts.filter(d => !d.isPaid).length,
          totalDue: debts.reduce((sum, d) => sum + parseFloat(d.totalDue), 0),
          totalPending: debts.reduce((sum, d) => sum + parseFloat(d.pendingAmount), 0),
        },
      };
    }),
  }),

  // ===== GESTIÓN DE USUARIOS =====
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    byRole: adminProcedure
      .input(z.object({ role: z.enum(["admin", "user"]) }))
      .query(async ({ input }) => {
        return await db.getUsersByRole(input.role);
      }),

    assignApartment: adminProcedure
      .input(z.object({
        userId: z.number(),
        apartmentId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUser(input.userId, { apartmentId: input.apartmentId });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "assign_apartment",
          entityType: "user",
          entityId: input.userId,
          details: `Apartamento ${input.apartmentId} asignado`,
        });

        return { success: true };
      }),

    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "user"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUser(input.userId, { role: input.role });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "update_role",
          entityType: "user",
          entityId: input.userId,
          details: `Rol actualizado a ${input.role}`,
        });

        return { success: true };
      }),

    pending: adminProcedure.query(async () => {
      return await db.getPendingUsers();
    }),

    approve: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUser(input.userId, {
          isApproved: true,
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "approve_user",
          entityType: "user",
          entityId: input.userId,
          details: "Usuario aprobado",
        });

        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({
        userId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUser(input.userId, {
          isApproved: false,
          rejectionReason: input.reason,
        });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "reject_user",
          entityType: "user",
          entityId: input.userId,
          details: `Usuario rechazado: ${input.reason}`,
        });

        return { success: true };
      }),
  }),

  // ===== GESTIÓN DE RECORDATORIOS =====
  reminders: router({
    create: adminProcedure
      .input(z.object({
        userId: z.number(),
        apartmentId: z.number(),
        month: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createReminder({
          userId: input.userId,
          apartmentId: input.apartmentId,
          month: input.month,
          message: input.message,
          status: "pending",
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "create_reminder",
          entityType: "reminder",
          details: `Recordatorio creado para ${input.month}`,
        });

        return { success: true };
      }),

    pending: adminProcedure.query(async () => {
      return await db.getPendingReminders();
    }),

    markSent: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateReminderStatus(input.id, "sent");
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "send_reminder",
          entityType: "reminder",
          entityId: input.id,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
