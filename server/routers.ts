import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { generatePDF, generateExcel } from "./exports";
import { verifySupabaseToken } from "./_core/supabase";
import { createPresignedUploadUrl, createPresignedDownloadUrl, deleteFile } from "./_core/storage";

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
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      // Safe DTO — no exponer campos internos
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        apartmentId: user.apartmentId,
        approvalStatus: user.approvalStatus,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    setSessionCookie: publicProcedure
      .input(z.object({ accessToken: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const supabaseUser = await verifySupabaseToken(input.accessToken);
        if (!supabaseUser) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token inválido o expirado",
          });
        }
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, input.accessToken, {
          ...cookieOptions,
          maxAge: 60 * 60 * 24 * 7, // 7 días
        });
        return { success: true } as const;
      }),
  }),

  // ===== CONFIGURACIÓN DEL CONDOMINIO =====
  config: router({
    get: protectedProcedure.query(async () => {
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
        apartmentNamePattern: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.updateCondominiumConfig(input);
        return await db.getCondominiumConfig();
      }),

    initializeStructure: adminProcedure.mutation(async () => {
      await db.initializeFloorsAndApartments();
      return { success: true };
    }),

    generateApartmentNames: adminProcedure.mutation(async () => {
      const result = await db.generateAllApartmentNames();
      return result || { success: false };
    }),

    getPatternExamples: adminProcedure
      .input(z.object({ pattern: z.string() }))
      .query(async ({ input }) => {
        const config = await db.getCondominiumConfig();
        if (!config) return [];
        return db.generatePatternExamples(input.pattern, config.floors || 5, config.apartmentsPerFloor || 6);
      }),
  }),

  // ===== GESTIÓN DE PISOS Y APARTAMENTOS =====
  floors: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllFloors();
    }),

    withApartments: protectedProcedure.query(async () => {
      const floors = await db.getAllFloors();
      const apartments = await db.getAllApartments();
      
      return floors.map(floor => ({
        ...floor,
        apartments: apartments.filter(apt => apt.floorId === floor.id),
      }));
    }),
  }),

  apartments: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllApartments();
    }),

    byFloor: protectedProcedure
      .input(z.object({ floorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getApartmentsByFloor(input.floorId);
      }),

    updateName: adminProcedure
      .input(z.object({
        apartmentId: z.number(),
        name: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateApartmentName(input.apartmentId, input.name);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "update_apartment_name",
          entityType: "apartment",
          entityId: input.apartmentId,
          details: `Nombre actualizado a: ${input.name}`,
        });

        return { success: true };
      }),
  }),

  // ===== GESTIÓN DE COBROS =====
  charges: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllCharges();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        amount: z.string().refine(
          val => {
            const n = parseFloat(val);
            return !isNaN(n) && n > 0;
          },
          { message: "El monto debe ser un número positivo mayor a cero" }
        ),
        currency: z.enum(["USD", "VES"]).default("USD"),
        isRecurring: z.boolean().default(true),
        apartmentId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Obtener configuracion del condominio para la tasa de cambio
        const config = await db.getCondominiumConfig();
        const exchangeRate = config ? parseFloat(config.exchangeRate || "1") : 1;
        
        // Convertir VES a USD si es necesario
        let amountInUSD = parseFloat(input.amount);
        if (input.currency === "VES" && exchangeRate > 0) {
          amountInUSD = amountInUSD / exchangeRate;
        }
        
        if (isNaN(amountInUSD) || amountInUSD <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El monto debe ser un número positivo mayor a cero" });
        }
        
        const result = await db.createCharge({
          name: input.name,
          description: input.description,
          amount: amountInUSD.toFixed(2),
          currency: "USD", // Siempre guardar en USD
          isRecurring: input.isRecurring,
          isActive: true,
          apartmentId: input.apartmentId || null,
        });

        if (result && result.id) {
          await db.generateDebtsFromCharge(result.id);
        }

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "create_charge",
          details: `Creo cobro: ${input.name}`,
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
        apartmentId: z.number().optional(),
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
        amount: z.string().refine(
          val => {
            const n = parseFloat(val);
            return !isNaN(n) && n > 0;
          },
          { message: "El monto debe ser un número positivo mayor a cero" }
        ),
        currency: z.enum(["USD", "VES"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user.apartmentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Usuario no tiene apartamento asignado" });
        }

        const amountNum = parseFloat(input.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El monto debe ser un número positivo mayor a cero" });
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
        // Obtener detalles del pago
        const payment = await db.getPaymentById(input.id);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
        }

        // Usar función mejorada con validaciones ACID
        const result = await db.approvePaymentWithValidations(
          input.id,
          ctx.user.id,
          input.notes
        );
        
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.message
          });
        }

        // Notificar al usuario que su pago fue aprobado
        await db.notifyPaymentApproved(
          payment.userId,
          input.id,
          payment.amount,
          payment.currency || "USD"
        );

        return {
          success: true,
          message: result.message,
          appliedAmount: result.appliedAmount
        };
      }),

    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const payment = await db.getPaymentById(input.id);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
        }

        await db.updatePaymentStatus(input.id, "rejected", ctx.user.id, input.notes);
        
        await db.notifyPaymentRejected(
          payment.userId,
          input.id,
          input.notes
        );
        
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
      .query(async ({ input, ctx }) => {
        // IDOR protection: admin puede ver cualquier apto, usuario solo el suyo
        if (ctx.user.role !== "admin" && ctx.user.apartmentId !== input.apartmentId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para ver pagos de este apartamento",
          });
        }
        return await db.getPaymentsByApartment(input.apartmentId, input.month);
      }),

    myPayments: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.apartmentId) return [];
      return await db.getPaymentsByApartment(ctx.user.apartmentId);
    }),

    uploadVoucher: protectedProcedure
      .input(z.object({
        paymentId: z.number(),
        fileData: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const payment = await db.getPaymentById(input.paymentId);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
        }

        if (payment.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para subir este comprobante" });
        }

        try {
          const fileBuffer = Buffer.from(input.fileData, "base64");
          const result = await db.uploadPaymentVoucher(
            input.paymentId,
            fileBuffer,
            input.fileName,
            input.mimeType
          );

          await db.createAuditLog({
            userId: ctx.user.id,
            action: "upload_voucher",
            entityType: "payment",
            entityId: input.paymentId,
            details: `Comprobante subido: ${input.fileName}`,
          });

          return { success: true, url: result.url };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Error al subir comprobante",
          });
        }
      }),

    getVoucher: protectedProcedure
      .input(z.object({ paymentId: z.number() }))
      .query(async ({ input, ctx }) => {
        const payment = await db.getPaymentById(input.paymentId);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
        }

        if (payment.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver este comprobante" });
        }

        const url = await db.getPaymentVoucherUrl(input.paymentId);
        return { url };
      }),

    recordManualPayment: adminProcedure
      .input(z.object({
        apartmentId: z.number(),
        amount: z.number().positive(),
        month: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Crear pago manual
        const result = await db.createPayment({
          apartmentId: input.apartmentId,
          userId: ctx.user.id,
          amount: input.amount.toString(),
          month: input.month,
          currency: "USD",
          status: "approved",
          voucherNumber: `MANUAL-${Date.now()}`,
        });

        if (!result) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al crear pago" });
        }

        // Aplicar liquidacion automatica
        await db.applyPaymentToDebts(input.apartmentId, input.amount);

        // Crear log de auditoria
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "record_manual_payment",
          entityType: "payment",
          details: `Pago manual de $${input.amount} registrado para apartamento ${input.apartmentId}. ${input.notes || ''}`,
        });

        return { success: true };
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
      const sortBy = 'floor'; // Default sort by floor
      
      // Usar la nueva función que retorna TODOS los apartamentos
      const debts = await db.getAllApartmentsWithDebtStatus(currentMonth, sortBy);
      
      // Calcular totales
      const {
        totalApartments,
        apartmentsWithoutDebt: paid,
        totalPending,
        totalDue,
      } = db.computeDebtSummary(debts);
      const apartmentsWithDebtCount = totalApartments - paid;

      return {
        currentMonth,
        debts,
        sortBy,
        summary: {
          total: totalApartments,
          paid,
          pending: apartmentsWithDebtCount,
          totalDue,
          totalPending,
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
          approvalStatus: 'approved',
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
          approvalStatus: 'rejected',
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

    changeRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        newRole: z.enum(["admin", "user"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.changeUserRole(input.userId, input.newRole);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "change_role",
          entityType: "user",
          entityId: input.userId,
          details: `Rol cambiado a ${input.newRole}`,
        });

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteUser(input.userId);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "delete_user",
          entityType: "user",
          entityId: input.userId,
          details: "Usuario eliminado del sistema",
        });

        return { success: true };
      }),

    toggleActive: adminProcedure
      .input(z.object({
        userId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.toggleUserActive(input.userId, input.isActive);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: input.isActive ? "activate_user" : "deactivate_user",
          entityType: "user",
          entityId: input.userId,
          details: `Usuario ${input.isActive ? "activado" : "desactivado"}`,
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

  // ===== NOTIFICACIONES =====
  notifications: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input, ctx }) => {
        return await db.getUserNotifications(ctx.user.id, input.limit);
      }),

    unread: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotifications(ctx.user.id);
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.countUnreadNotifications(ctx.user.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const notification = await db.getUserNotifications(ctx.user.id, 1000);
        const exists = notification.some(n => n.id === input.id);
        
        if (!exists) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Notificación no encontrada" });
        }

        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ===== REPORTES =====
  reports: router({
    monthlyData: protectedProcedure
      .input(z.object({
        apartmentId: z.number().optional(),
        month: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const apartmentId = input.apartmentId || ctx.user.apartmentId;
        
        if (!apartmentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Apartamento no especificado" });
        }

        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.apartmentId !== apartmentId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver este reporte" });
        }

        const reportData = await db.getMonthlyReportData(apartmentId, input.month);
        if (!reportData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Reporte no encontrado" });
        }

        return reportData;
      }),

    userSummary: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserPaymentsSummary(ctx.user.id);
    }),

    debtsSummary: adminProcedure
      .input(z.object({ month: z.string() }))
      .query(async ({ input }) => {
        return await db.getMonthlyDebtsSummary(input.month);
      }),

    paymentsByStatus: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected"]),
        month: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPaymentsByStatus(input.status, input.month);
      }),

    exportJSON: protectedProcedure
      .input(z.object({
        apartmentId: z.number().optional(),
        month: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const apartmentId = input.apartmentId || ctx.user.apartmentId;
        
        if (!apartmentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Apartamento no especificado" });
        }

        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.apartmentId !== apartmentId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para exportar este reporte" });
        }

        const reportJSON = await db.generateReportJSON(apartmentId, input.month);
        if (!reportJSON) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Reporte no encontrado" });
        }

        return reportJSON;
      }),

    paymentStatusExport: adminProcedure
      .input(z.object({
        month: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const month = input.month || new Date().toISOString().slice(0, 7);
        const sortBy = 'floor';
        
        const debts = await db.getAllApartmentsWithDebtStatus(month, sortBy);
        const {
          totalApartments,
          apartmentsWithoutDebt: paid,
          totalPending,
          totalDue,
        } = db.computeDebtSummary(debts);
        const apartmentsWithDebtCount = totalApartments - paid;

        const config = await db.getCondominiumConfig();

        return {
          month,
          condominiumName: config?.name || "Condominio",
          debts,
          summary: {
            total: totalApartments,
            paid,
            pending: apartmentsWithDebtCount,
            totalDue,
            totalPending,
          },
        };
      }),

    downloadPDF: adminProcedure
      .input(z.object({
        month: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const month = input.month || new Date().toISOString().slice(0, 7);
        const sortBy = 'floor';
        
        const debts = await db.getAllApartmentsWithDebtStatus(month, sortBy);
        const {
          totalApartments,
          apartmentsWithoutDebt: paid,
          totalPending,
          totalDue,
        } = db.computeDebtSummary(debts);
        const apartmentsWithDebtCount = totalApartments - paid;

        const config = await db.getCondominiumConfig();

        const pdfBuffer = await generatePDF({
          month,
          condominiumName: config?.name || "Condominio",
          debts: debts.map(d => ({
            apartmentId: d.apartmentId,
            apartmentName: d.unitName || d.apartmentNumber,
            totalDue: d.totalDue,
            pendingAmount: d.pendingAmount,
            isPaid: d.isPaid,
          })),
          summary: {
            total: totalApartments,
            paid,
            pending: apartmentsWithDebtCount,
            totalDue,
            totalPending,
          },
        });
        
        return { buffer: pdfBuffer.toString('base64'), filename: `Estado-Pagos-${month}.pdf` };
      }),

    downloadExcel: adminProcedure
      .input(z.object({
        month: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const month = input.month || new Date().toISOString().slice(0, 7);
        const sortBy = 'floor';
        
        const debts = await db.getAllApartmentsWithDebtStatus(month, sortBy);
        const {
          totalApartments,
          apartmentsWithoutDebt: paid,
          totalPending,
          totalDue,
        } = db.computeDebtSummary(debts);
        const apartmentsWithDebtCount = totalApartments - paid;

        const config = await db.getCondominiumConfig();

        const excelBuffer = await generateExcel({
          month,
          condominiumName: config?.name || "Condominio",
          debts: debts.map(d => ({
            apartmentId: d.apartmentId,
            apartmentName: d.unitName || d.apartmentNumber,
            totalDue: d.totalDue,
            pendingAmount: d.pendingAmount,
            isPaid: d.isPaid,
          })),
          summary: {
            total: totalApartments,
            paid,
            pending: apartmentsWithDebtCount,
            totalDue,
            totalPending,
          },
        });
        
        return { buffer: excelBuffer.toString('base64'), filename: `Estado-Pagos-${month}.xlsx` };
      }),
  }),

  // ===== STORAGE (PRESIGNED URLS) =====
  storage: router({
    generateUploadUrl: protectedProcedure
      .input(z.object({
        filePath: z.string().min(1).max(255),
        expiresIn: z.number().min(60).max(86400).optional(),
      }))
      .mutation(async ({ input }) => {
        return createPresignedUploadUrl(input.filePath, input.expiresIn);
      }),

    generateDownloadUrl: protectedProcedure
      .input(z.object({
        filePath: z.string().min(1).max(255),
        expiresIn: z.number().min(60).max(86400).optional(),
      }))
      .query(async ({ input }) => {
        return createPresignedDownloadUrl(input.filePath, input.expiresIn);
      }),

    delete: adminProcedure
      .input(z.object({
        filePath: z.string().min(1).max(255),
      }))
      .mutation(async ({ input }) => {
        await deleteFile(input.filePath);
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
