import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  date,
  longtext
} from "drizzle-orm/mysql-core";

/**
 * TABLA: users
 * Usuarios del sistema (administradores y residentes)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  apartmentId: int("apartmentId"), // FK a apartments
  isApproved: boolean("isApproved").default(false), // Debe ser aprobado por admin
  approvedBy: int("approvedBy"), // FK a users (admin que aprobó)
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"), // Razón si fue rechazado
  isActive: boolean("isActive").default(true), // Usuario activo/inactivo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * TABLA: condominiumConfig
 * Configuración general del condominio (una sola fila)
 */
export const condominiumConfig = mysqlTable("condominiumConfig", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).default("Mi Condominio"),
  floors: int("floors").default(5), // PB + 4 pisos = 5 niveles
  apartmentsPerFloor: int("apartmentsPerFloor").default(6),
  baseFee: decimal("baseFee", { precision: 10, scale: 2 }).default("0.00"), // Mensualidad base en USD
  defaultCurrency: mysqlEnum("defaultCurrency", ["USD", "VES"]).default("USD"),
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 4 }).default("1.0000"), // VES a USD
  reminderDay: int("reminderDay").default(5), // Día del mes para enviar recordatorios (1-28)
  apartmentNamePattern: varchar("apartmentNamePattern", { length: 255 }).default("Apt-{piso}-{numero}"), // Patrón para nombres
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CondominiumConfig = typeof condominiumConfig.$inferSelect;
export type InsertCondominiumConfig = typeof condominiumConfig.$inferInsert;

/**
 * TABLA: floors
 * Pisos del condominio
 */
export const floors = mysqlTable("floors", {
  id: int("id").autoincrement().primaryKey(),
  floorNumber: int("floorNumber").notNull(), // 0 = PB, 1-4 = pisos
  floorName: varchar("floorName", { length: 100 }).notNull(), // "Planta Baja", "Piso 1", etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Floor = typeof floors.$inferSelect;
export type InsertFloor = typeof floors.$inferInsert;

/**
 * TABLA: apartments
 * Apartamentos del condominio
 */
export const apartments = mysqlTable("apartments", {
  id: int("id").autoincrement().primaryKey(),
  floorId: int("floorId").notNull(), // FK a floors
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
export const charges = mysqlTable("charges", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // "Agua", "Electricidad", etc.
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: mysqlEnum("currency", ["USD", "VES"]).default("USD"),
  isRecurring: boolean("isRecurring").default(true), // ¿Es mensual?
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Charge = typeof charges.$inferSelect;
export type InsertCharge = typeof charges.$inferInsert;

/**
 * TABLA: payments
 * Pagos realizados por residentes
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK a users
  apartmentId: int("apartmentId").notNull(), // FK a apartments
  month: varchar("month", { length: 7 }).notNull(), // "2026-03" formato YYYY-MM
  voucherNumber: varchar("voucherNumber", { length: 100 }),
  voucherImage: longtext("voucherImage"), // Base64 o URL de imagen
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: mysqlEnum("currency", ["USD", "VES"]).default("USD"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: int("reviewedBy"), // FK a users (admin que revisó)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * TABLA: monthlyDebts
 * Deudas mensuales por apartamento (desnormalizado para performance)
 */
export const monthlyDebts = mysqlTable("monthlyDebts", {
  id: int("id").autoincrement().primaryKey(),
  apartmentId: int("apartmentId").notNull(), // FK a apartments
  month: varchar("month", { length: 7 }).notNull(), // "2026-03"
  baseFeeAmount: decimal("baseFeeAmount", { precision: 10, scale: 2 }).notNull(),
  additionalCharges: decimal("additionalCharges", { precision: 10, scale: 2 }).default("0.00"),
  totalDue: decimal("totalDue", { precision: 10, scale: 2 }).notNull(),
  totalPaid: decimal("totalPaid", { precision: 10, scale: 2 }).default("0.00"),
  pendingAmount: decimal("pendingAmount", { precision: 10, scale: 2 }).notNull(),
  currency: mysqlEnum("currency", ["USD", "VES"]).default("USD"),
  isPaid: boolean("isPaid").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyDebt = typeof monthlyDebts.$inferSelect;
export type InsertMonthlyDebt = typeof monthlyDebts.$inferInsert;

/**
 * TABLA: reminders
 * Recordatorios enviados a usuarios
 */
export const reminders = mysqlTable("reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK a users
  apartmentId: int("apartmentId").notNull(), // FK a apartments
  month: varchar("month", { length: 7 }).notNull(), // "2026-03"
  message: text("message"),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

/**
 * TABLA: auditLog
 * Registro de auditoría de acciones importantes
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // FK a users (quién hizo la acción)
  action: varchar("action", { length: 255 }).notNull(), // "approve_payment", "create_charge", etc.
  entityType: varchar("entityType", { length: 100 }), // "payment", "charge", "user", etc.
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
