import { 
  pgEnum,
  pgTable, 
  serial,
  integer,
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean
} from "drizzle-orm/pg-core";

// ===== ENUMS =====
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const currencyEnum = pgEnum("currency", ["USD", "VES"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "rejected"]);
export const reminderStatusEnum = pgEnum("reminder_status", ["pending", "sent", "failed"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "payment_approved",
  "payment_rejected",
  "payment_received",
  "debt_created",
  "debt_paid",
  "reminder",
  "system",
]);

/**
 * TABLA: users
 * Usuarios del sistema (administradores y residentes)
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  apartmentId: integer("apartmentId"), // FK a apartments
  isApproved: boolean("isApproved").default(false), // DEPRECATED, usar approvalStatus
  approvalStatus: approvalStatusEnum("approvalStatus").default("pending"), // Estado de aprobación
  approvedBy: integer("approvedBy"), // FK a users (admin que aprobó)
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"), // Razón si fue rechazado
  isActive: boolean("isActive").default(true), // Usuario activo/inactivo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * TABLA: condominiumConfig
 * Configuración general del condominio (una sola fila)
 */
export const condominiumConfig = pgTable("condominiumConfig", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).default("Mi Condominio"),
  floors: integer("floors").default(5), // PB + 4 pisos = 5 niveles
  apartmentsPerFloor: integer("apartmentsPerFloor").default(6),
  baseFee: decimal("baseFee", { precision: 10, scale: 2 }).default("0.00"), // Mensualidad base en USD
  defaultCurrency: currencyEnum("defaultCurrency").default("USD"),
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 4 }).default("1.0000"), // VES a USD
  reminderDay: integer("reminderDay").default(5), // Día del mes para enviar recordatorios (1-28)
  apartmentNamePattern: varchar("apartmentNamePattern", { length: 255 }).default("Apt-{piso}-{numero}"), // Patrón para nombres
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CondominiumConfig = typeof condominiumConfig.$inferSelect;
export type InsertCondominiumConfig = typeof condominiumConfig.$inferInsert;

/**
 * TABLA: floors
 * Pisos del condominio
 */
export const floors = pgTable("floors", {
  id: serial("id").primaryKey(),
  floorNumber: integer("floorNumber").notNull(), // 0 = PB, 1-4 = pisos
  floorName: varchar("floorName", { length: 100 }).notNull(), // "Planta Baja", "Piso 1", etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Floor = typeof floors.$inferSelect;
export type InsertFloor = typeof floors.$inferInsert;

/**
 * TABLA: apartments
 * Apartamentos del condominio
 */
export const apartments = pgTable("apartments", {
  id: serial("id").primaryKey(),
  floorId: integer("floorId").notNull(), // FK a floors
  apartmentNumber: varchar("apartmentNumber", { length: 50 }).notNull(), // "101", "201", etc.
  unitName: varchar("unitName", { length: 100 }), // Nombre descriptivo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Apartment = typeof apartments.$inferSelect;
export type InsertApartment = typeof apartments.$inferInsert;

/**
 * TABLA: charges
 * Cobros adicionales (servicios, mantenimiento, etc.)
 */
export const charges = pgTable("charges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // "Agua", "Electricidad", etc.
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  isRecurring: boolean("isRecurring").default(true), // ¿Es mensual?
  isActive: boolean("isActive").default(true),
  apartmentId: integer("apartmentId"), // FK a apartments (null = aplica a todos)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Charge = typeof charges.$inferSelect;
export type InsertCharge = typeof charges.$inferInsert;

/**
 * TABLA: payments
 * Pagos realizados por residentes
 */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // FK a users
  apartmentId: integer("apartmentId").notNull(), // FK a apartments
  month: varchar("month", { length: 7 }).notNull(), // "2026-03" formato YYYY-MM
  voucherNumber: varchar("voucherNumber", { length: 100 }),
  voucherImage: text("voucherImage"), // DEPRECATED: Base64 antiguo, migrar a S3
  voucherImageUrl: varchar("voucherImageUrl", { length: 500 }), // URL de S3
  voucherImageKey: varchar("voucherImageKey", { length: 255 }), // Clave en S3 para eliminar
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  status: paymentStatusEnum("status").default("pending"),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: integer("reviewedBy"), // FK a users (admin que revisó)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * TABLA: monthlyDebts
 * Deudas mensuales por apartamento (desnormalizado para performance)
 */
export const monthlyDebts = pgTable("monthlyDebts", {
  id: serial("id").primaryKey(),
  apartmentId: integer("apartmentId").notNull(), // FK a apartments
  chargeId: integer("chargeId"), // FK a charges (para rastrear qué cobro generó esta deuda)
  month: varchar("month", { length: 7 }).notNull(), // "2026-03"
  totalDue: decimal("totalDue", { precision: 10, scale: 2 }).notNull(),
  totalPaid: decimal("totalPaid", { precision: 10, scale: 2 }).default("0.00"),
  pendingAmount: decimal("pendingAmount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  isPaid: boolean("isPaid").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MonthlyDebt = typeof monthlyDebts.$inferSelect;
export type InsertMonthlyDebt = typeof monthlyDebts.$inferInsert;

/**
 * TABLA: reminders
 * Recordatorios enviados a usuarios
 */
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // FK a users
  apartmentId: integer("apartmentId").notNull(), // FK a apartments
  month: varchar("month", { length: 7 }).notNull(), // "2026-03"
  message: text("message"),
  sentAt: timestamp("sentAt"),
  status: reminderStatusEnum("status").default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

/**
 * TABLA: auditLog
 * Registro de auditoría de acciones importantes
 */
export const auditLog = pgTable("auditLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId"), // FK a users (quién hizo la acción)
  action: varchar("action", { length: 255 }).notNull(), // "approve_payment", "create_charge", etc.
  entityType: varchar("entityType", { length: 100 }), // "payment", "charge", "user", etc.
  entityId: integer("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * TABLA: notifications
 * Notificaciones para usuarios (in-app)
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // FK a users (destinatario)
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 100 }), // "payment", "debt", etc.
  relatedEntityId: integer("relatedEntityId"),
  isRead: boolean("isRead").default(false),
  actionUrl: varchar("actionUrl", { length: 512 }), // URL para la acción
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
