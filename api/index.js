var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/supabase.ts
import { createClient } from "@supabase/supabase-js";
async function verifySupabaseToken(token) {
  if (!supabaseAnon) return null;
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
function extractAuthToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
var supabaseUrl, supabaseAnonKey, supabaseServiceKey, supabaseAnon, supabaseAdmin;
var init_supabase = __esm({
  "server/_core/supabase.ts"() {
    "use strict";
    supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
    supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? "";
    supabaseAnon = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }) : null;
    supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }) : null;
  }
});

// server/_core/storage.ts
var storage_exports = {};
__export(storage_exports, {
  createPresignedDownloadUrl: () => createPresignedDownloadUrl,
  createPresignedUploadUrl: () => createPresignedUploadUrl,
  deleteFile: () => deleteFile
});
async function ensureBucket(name = DEFAULT_BUCKET) {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === name);
  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(name, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024
      // 10 MB
    });
    if (error && !error.message.includes("already exists")) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
  }
  return name;
}
async function createPresignedUploadUrl(filePath, expiresIn = 3600, bucketName) {
  const bucket = await ensureBucket(bucketName);
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(filePath, {
    upsert: false
  });
  if (error) throw new Error(`Failed to create upload URL: ${error.message}`);
  const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  return {
    signedUrl: data.signedUrl,
    publicUrl: publicUrlData.publicUrl,
    token: data.token,
    path: data.path
  };
}
async function createPresignedDownloadUrl(filePath, expiresIn = 3600, bucketName) {
  const bucket = bucketName || DEFAULT_BUCKET;
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(filePath, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
async function deleteFile(filePath, bucketName) {
  const bucket = bucketName || DEFAULT_BUCKET;
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
  if (error) throw new Error(`Failed to delete file: ${error.message}`);
}
var DEFAULT_BUCKET;
var init_storage = __esm({
  "server/_core/storage.ts"() {
    "use strict";
    init_supabase();
    DEFAULT_BUCKET = "condominio-admin";
  }
});

// api/_entry.ts
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  }))
});

// server/routers.ts
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/db/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// server/_core/logger.ts
import pino from "pino";
var isDev = process.env.NODE_ENV !== "production";
var logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev ? { target: "pino-pretty", options: { colorize: true } } : void 0,
  base: isDev ? void 0 : { pid: process.pid }
});
function createLogger(module) {
  return logger.child({ module });
}

// server/db/client.ts
var log = createLogger("client");
var _db = null;
var _pgClient = null;
async function getDb() {
  if (!_db) {
    console.log("[db] DATABASE_URL present:", !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
      try {
        console.log("[db] Attempting connection...");
        _pgClient = postgres(process.env.DATABASE_URL, {
          max: 10,
          idle_timeout: 30,
          connect_timeout: 10,
          prepare: false,
          max_lifetime: 60 * 5
        });
        _db = drizzle(_pgClient);
        console.log("[db] Connected successfully");
      } catch (error) {
        console.warn("[db] Failed to connect:", error);
        _db = null;
      }
    } else {
      console.log("[db] DATABASE_URL not set");
    }
  }
  return _db;
}

// server/db/users.ts
import { eq as eq2 } from "drizzle-orm";

// drizzle/schema.ts
import {
  pgEnum,
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index
} from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);
var currencyEnum = pgEnum("currency", ["USD", "VES"]);
var paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "rejected"]);
var reminderStatusEnum = pgEnum("reminder_status", ["pending", "sent", "failed"]);
var notificationTypeEnum = pgEnum("notification_type", [
  "payment_approved",
  "payment_rejected",
  "payment_received",
  "debt_created",
  "debt_paid",
  "reminder",
  "system"
]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  apartmentId: integer("apartmentId"),
  // FK a apartments
  isApproved: boolean("isApproved").default(false),
  // DEPRECATED, usar approvalStatus
  approvalStatus: approvalStatusEnum("approvalStatus").default("pending"),
  // Estado de aprobación
  approvedBy: integer("approvedBy"),
  // FK a users (admin que aprobó)
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  // Razón si fue rechazado
  isActive: boolean("isActive").default(true),
  // Usuario activo/inactivo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var condominiumConfig = pgTable("condominiumConfig", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).default("Mi Condominio"),
  floors: integer("floors").default(5),
  // PB + 4 pisos = 5 niveles
  apartmentsPerFloor: integer("apartmentsPerFloor").default(6),
  baseFee: decimal("baseFee", { precision: 10, scale: 2 }).default("0.00"),
  // Mensualidad base en USD
  defaultCurrency: currencyEnum("defaultCurrency").default("USD"),
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 4 }).default("1.0000"),
  // VES a USD
  reminderDay: integer("reminderDay").default(5),
  // Día del mes para enviar recordatorios (1-28)
  apartmentNamePattern: varchar("apartmentNamePattern", { length: 255 }).default("Apt-{piso}-{numero}"),
  // Patrón para nombres
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var floors = pgTable("floors", {
  id: serial("id").primaryKey(),
  floorNumber: integer("floorNumber").notNull(),
  // 0 = PB, 1-4 = pisos
  floorName: varchar("floorName", { length: 100 }).notNull(),
  // "Planta Baja", "Piso 1", etc.
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var apartments = pgTable("apartments", {
  id: serial("id").primaryKey(),
  floorId: integer("floorId").notNull(),
  // FK a floors
  apartmentNumber: varchar("apartmentNumber", { length: 50 }).notNull(),
  // "101", "201", etc.
  unitName: varchar("unitName", { length: 100 }),
  // Nombre descriptivo
  creditBalance: decimal("creditBalance", { precision: 10, scale: 2 }).default("0.00"),
  // Saldo a favor (pago de más) aplicable a deudas futuras
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var charges = pgTable("charges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // "Agua", "Electricidad", etc.
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  isRecurring: boolean("isRecurring").default(true),
  // ¿Es mensual?
  isActive: boolean("isActive").default(true),
  apartmentId: integer("apartmentId"),
  // FK a apartments (null = aplica a todos)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  // FK a users
  apartmentId: integer("apartmentId").notNull(),
  // FK a apartments
  month: varchar("month", { length: 7 }).notNull(),
  // "2026-03" formato YYYY-MM
  voucherNumber: varchar("voucherNumber", { length: 100 }),
  voucherImage: text("voucherImage"),
  // DEPRECATED: Base64 antiguo, migrar a S3
  voucherImageUrl: varchar("voucherImageUrl", { length: 500 }),
  // URL de S3
  voucherImageKey: varchar("voucherImageKey", { length: 255 }),
  // Clave en S3 para eliminar
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  status: paymentStatusEnum("status").default("pending"),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: integer("reviewedBy"),
  // FK a users (admin que revisó)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  index("idx_payments_apartment_month").on(table.apartmentId, table.month),
  index("idx_payments_user_month").on(table.userId, table.month),
  index("idx_payments_status_created").on(table.status, table.createdAt)
]);
var monthlyDebts = pgTable("monthlyDebts", {
  id: serial("id").primaryKey(),
  apartmentId: integer("apartmentId").notNull(),
  // FK a apartments
  chargeId: integer("chargeId"),
  // FK a charges (para rastrear qué cobro generó esta deuda)
  month: varchar("month", { length: 7 }).notNull(),
  // "2026-03"
  totalDue: decimal("totalDue", { precision: 10, scale: 2 }).notNull(),
  totalPaid: decimal("totalPaid", { precision: 10, scale: 2 }).default("0.00"),
  pendingAmount: decimal("pendingAmount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  isPaid: boolean("isPaid").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  index("idx_debts_apartment_month").on(table.apartmentId, table.month),
  index("idx_debts_month").on(table.month),
  index("idx_debts_charge_id").on(table.chargeId)
]);
var reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  // FK a users
  apartmentId: integer("apartmentId").notNull(),
  // FK a apartments
  month: varchar("month", { length: 7 }).notNull(),
  // "2026-03"
  message: text("message"),
  sentAt: timestamp("sentAt"),
  status: reminderStatusEnum("status").default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var auditLog = pgTable("auditLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  // FK a users (quién hizo la acción)
  action: varchar("action", { length: 255 }).notNull(),
  // "approve_payment", "create_charge", etc.
  entityType: varchar("entityType", { length: 100 }),
  // "payment", "charge", "user", etc.
  entityId: integer("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  index("idx_auditlog_user_created").on(table.userId, table.createdAt),
  index("idx_auditlog_action").on(table.action)
]);
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  // FK a users (destinatario)
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 100 }),
  // "payment", "debt", etc.
  relatedEntityId: integer("relatedEntityId"),
  isRead: boolean("isRead").default(false),
  actionUrl: varchar("actionUrl", { length: 512 }),
  // URL para la acción
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt")
}, (table) => [
  index("idx_notif_user_read_created").on(table.userId, table.isRead, table.createdAt)
]);

// server/db/condominium.ts
import { eq } from "drizzle-orm";
var log2 = createLogger("condominium");
async function getCondominiumConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(condominiumConfig).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function updateCondominiumConfig(data) {
  const db = await getDb();
  if (!db) return null;
  if (data.floors !== void 0 || data.apartmentsPerFloor !== void 0) {
    const existingFloors = await db.select().from(floors);
    const existingApartments = await db.select().from(apartments);
    if (existingFloors.length > 0 || existingApartments.length > 0) {
      const current = await getCondominiumConfig();
      const wantsToChange = data.floors !== void 0 && current !== null && data.floors !== current.floors || data.apartmentsPerFloor !== void 0 && current !== null && data.apartmentsPerFloor !== current.apartmentsPerFloor;
      if (wantsToChange) {
        throw new Error(
          "La estructura del condominio ya fue creada y es inmutable. Para cambiar pisos o apartamentos, se requiere intervenci\xF3n directa en la base de datos."
        );
      }
    }
  }
  const result = await db.update(condominiumConfig).set(data).where(eq(condominiumConfig.id, 1));
  return result;
}
async function initializeCondominiumConfig() {
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
    reminderDay: 5
  });
  return await getCondominiumConfig();
}
async function initializeFloorsAndApartments() {
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
      floorName: floorNames[i] || `Piso ${i}`
    }).returning({ id: floors.id });
    const floorId = floor.id;
    for (let j = 1; j <= numApartments; j++) {
      const apartmentNumber = `${i}${String(j).padStart(2, "0")}`;
      await db.insert(apartments).values({
        floorId,
        apartmentNumber,
        unitName: `Apt. ${apartmentNumber}`
      });
    }
  }
}
async function getAllFloors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(floors);
}
async function getAllApartments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(apartments);
}
async function getApartmentsByFloor(floorId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(apartments).where(eq(apartments.floorId, floorId));
}
function numberToLetter(num) {
  if (num < 1 || num > 26) return num.toString();
  return String.fromCharCode(64 + num);
}
function getSmartFloorNumber(floorNumber) {
  return floorNumber === 0 ? "PB" : floorNumber.toString();
}
function generateApartmentName(pattern, floorNumber, floorName, apartmentNumber) {
  const lastDigit = apartmentNumber % 10 || (apartmentNumber % 100 === 0 ? 10 : apartmentNumber % 100);
  const letra = numberToLetter(lastDigit);
  const smartFloorNumber = getSmartFloorNumber(floorNumber);
  return pattern.replace("{piso}", floorNumber.toString()).replace("{piso_inteligente}", smartFloorNumber).replace("{piso_nombre}", floorName).replace("{numero}", apartmentNumber.toString()).replace("{letra}", letra);
}
function generatePatternExamples(pattern, floorsCount, apartmentsPerFloor) {
  const examples = [];
  const floorNames = ["Planta Baja", ...Array.from({ length: floorsCount - 1 }, (_, i) => `Piso ${i + 1}`)];
  for (let floorIdx = 0; floorIdx < floorsCount; floorIdx++) {
    for (let aptNum = 1; aptNum <= Math.min(3, apartmentsPerFloor); aptNum++) {
      const apartmentNumber = parseInt(`${floorIdx}${String(aptNum).padStart(2, "0")}`);
      const example = generateApartmentName(
        pattern,
        floorIdx,
        floorNames[floorIdx],
        apartmentNumber
      );
      examples.push(example);
    }
  }
  return examples;
}
async function generateAllApartmentNames(patternOverride) {
  const db = await getDb();
  if (!db) throw new Error("No hay conexi\xF3n a la base de datos");
  const config = await getCondominiumConfig();
  if (!config) throw new Error("No hay configuraci\xF3n del condominio");
  if (patternOverride !== void 0 && patternOverride !== config.apartmentNamePattern) {
    await db.update(condominiumConfig).set({ apartmentNamePattern: patternOverride }).where(eq(condominiumConfig.id, config.id));
  }
  const pattern = patternOverride ?? config.apartmentNamePattern ?? "Apt-{piso}-{numero}";
  const allFloors = await getAllFloors();
  const allApartments = await getAllApartments();
  for (const apartment of allApartments) {
    const floor = allFloors.find((f) => f.id === apartment.floorId);
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
  return { success: true, updated: allApartments.length };
}
async function updateApartmentName(id, name) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(apartments).set({ unitName: name }).where(eq(apartments.id, id));
}

// server/db/users.ts
var log3 = createLogger("users");
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) {
    log3.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq2(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createUserFromSupabase(data) {
  const db = await getDb();
  if (!db) {
    log3.warn("[Database] Cannot create user: database not available");
    return void 0;
  }
  try {
    const insertData = {
      openId: data.supabaseUserId ?? data.email,
      email: data.email,
      name: data.name,
      loginMethod: "supabase",
      role: data.role ?? "user",
      isActive: true,
      approvalStatus: "pending",
      lastSignedIn: /* @__PURE__ */ new Date()
    };
    const result = await db.insert(users).values(insertData).returning();
    return result[0];
  } catch (error) {
    log3.error({ err: error }, "[Database] Failed to create user from Supabase:");
    return void 0;
  }
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq2(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}
async function getUsersByRole(role) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(eq2(users.role, role));
}
async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq } = await import("drizzle-orm");
  return await db.select().from(users).where(drizzleEq(users.approvalStatus, "pending"));
}
async function updateUser(id, data) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(users).set(data).where(eq2(users.id, id));
}
async function changeUserRole(userId, newRole) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(users).set({ role: newRole }).where(eq2(users.id, userId));
}
async function deleteUser(userId) {
  const db = await getDb();
  if (!db) return null;
  return await db.delete(users).where(eq2(users.id, userId));
}
async function toggleUserActive(userId, isActive) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(users).set({ isActive }).where(eq2(users.id, userId));
}

// server/db/charges.ts
import { and as and2, desc as desc2, eq as eq3, gt, inArray, isNull } from "drizzle-orm";
async function getAllCharges() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(charges).where(eq3(charges.isActive, true));
}
var RECENT_CHARGE_WINDOW_MS = 2 * 60 * 1e3;
async function createCharge(data) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [
    eq3(charges.isActive, true),
    eq3(charges.name, data.name || ""),
    eq3(charges.amount, String(data.amount || "")),
    gt(charges.createdAt, new Date(Date.now() - RECENT_CHARGE_WINDOW_MS))
  ];
  if (data.apartmentId) {
    conditions.push(eq3(charges.apartmentId, data.apartmentId));
  } else {
    conditions.push(isNull(charges.apartmentId));
  }
  const recent = await db.select({ id: charges.id }).from(charges).where(and2(...conditions)).limit(1);
  if (recent.length > 0) {
    const err = new Error(
      "Este cobro ya fue creado hace un momento (mismo nombre, monto y alcance). \xBFDoble clic?"
    );
    err.status = 400;
    throw err;
  }
  await db.insert(charges).values(data);
  const created = await db.select().from(charges).where(eq3(charges.name, data.name || "")).orderBy(desc2(charges.createdAt)).limit(1);
  return created && created.length > 0 ? created[0] : null;
}
async function updateCharge(id, data) {
  const db = await getDb();
  if (!db) return null;
  return await db.transaction(async (tx) => {
    const chargeResult = await tx.select().from(charges).where(eq3(charges.id, id)).limit(1);
    if (!chargeResult || chargeResult.length === 0) return null;
    const charge = chargeResult[0];
    if (data.amount !== void 0) {
      const oldAmount = parseFloat(charge.amount) || 0;
      const newAmount = parseFloat(data.amount) || 0;
      const delta = newAmount - oldAmount;
      if (Math.abs(delta) > 5e-3) {
        let affectedApartmentIds = [];
        if (charge.apartmentId) {
          affectedApartmentIds = [charge.apartmentId];
        } else {
          const all = await tx.select({ id: apartments.id }).from(apartments);
          affectedApartmentIds = all.map((a) => a.id);
        }
        const now = /* @__PURE__ */ new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const debts = await tx.select().from(monthlyDebts).where(and2(
          eq3(monthlyDebts.month, currentMonth),
          inArray(monthlyDebts.apartmentId, affectedApartmentIds)
        ));
        for (const debt of debts) {
          const due = parseFloat(debt.totalDue) || 0;
          const paid = parseFloat(debt.totalPaid) || 0;
          const newDue = Math.max(0, due + delta);
          let excessToCredit = 0;
          let adjustedPaid = paid;
          if (paid > newDue) {
            excessToCredit = paid - newDue;
            adjustedPaid = newDue;
          }
          const newPending = Math.max(0, newDue - adjustedPaid);
          if (excessToCredit > 5e-3) {
            const apt = await tx.select({ creditBalance: apartments.creditBalance }).from(apartments).where(eq3(apartments.id, debt.apartmentId)).limit(1);
            const currentCredit = apt.length > 0 ? parseFloat(apt[0].creditBalance) || 0 : 0;
            await tx.update(apartments).set({ creditBalance: (currentCredit + excessToCredit).toFixed(2) }).where(eq3(apartments.id, debt.apartmentId));
          }
          if (newDue <= 0 && newPending <= 0 && adjustedPaid <= 5e-3) {
            await tx.delete(monthlyDebts).where(eq3(monthlyDebts.id, debt.id));
          } else {
            await tx.update(monthlyDebts).set({
              totalDue: newDue.toFixed(2),
              totalPaid: adjustedPaid.toFixed(2),
              pendingAmount: newPending.toFixed(2),
              isPaid: newPending <= 5e-3
            }).where(eq3(monthlyDebts.id, debt.id));
          }
        }
      }
    }
    await tx.update(charges).set(data).where(eq3(charges.id, id));
    return true;
  });
}
async function deleteCharge(id) {
  const db = await getDb();
  if (!db) return null;
  return await db.transaction(async (tx) => {
    const chargeResult = await tx.select().from(charges).where(eq3(charges.id, id)).limit(1);
    if (!chargeResult || chargeResult.length === 0) return null;
    const charge = chargeResult[0];
    const created = charge.createdAt ? new Date(charge.createdAt) : /* @__PURE__ */ new Date();
    const month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const amount = parseFloat(charge.amount) || 0;
    let affectedApartmentIds = [];
    if (charge.apartmentId) {
      affectedApartmentIds = [charge.apartmentId];
    } else {
      const all = await tx.select({ id: apartments.id }).from(apartments);
      affectedApartmentIds = all.map((a) => a.id);
    }
    if (affectedApartmentIds.length > 0) {
      const debts = await tx.select().from(monthlyDebts).where(and2(
        eq3(monthlyDebts.month, month),
        inArray(monthlyDebts.apartmentId, affectedApartmentIds)
      ));
      for (const debt of debts) {
        const due = parseFloat(debt.totalDue) || 0;
        const paid = parseFloat(debt.totalPaid) || 0;
        const pending = parseFloat(debt.pendingAmount) || 0;
        const newDue = Math.max(0, due - amount);
        let excessToCredit = 0;
        let adjustedPaid = paid;
        if (paid > newDue) {
          excessToCredit = paid - newDue;
          adjustedPaid = newDue;
        }
        const newPending = Math.max(0, newDue - adjustedPaid);
        if (excessToCredit > 5e-3) {
          const apt = await tx.select({ creditBalance: apartments.creditBalance }).from(apartments).where(eq3(apartments.id, debt.apartmentId)).limit(1);
          const currentCredit = apt.length > 0 ? parseFloat(apt[0].creditBalance) || 0 : 0;
          await tx.update(apartments).set({ creditBalance: (currentCredit + excessToCredit).toFixed(2) }).where(eq3(apartments.id, debt.apartmentId));
        }
        if (newDue <= 0 && newPending <= 0 && adjustedPaid <= 5e-3) {
          await tx.delete(monthlyDebts).where(eq3(monthlyDebts.id, debt.id));
        } else {
          await tx.update(monthlyDebts).set({
            totalDue: newDue.toFixed(2),
            totalPaid: adjustedPaid.toFixed(2),
            pendingAmount: newPending.toFixed(2),
            isPaid: newPending <= 5e-3
          }).where(eq3(monthlyDebts.id, debt.id));
        }
      }
    }
    return await tx.update(charges).set({ isActive: false }).where(eq3(charges.id, id));
  });
}

// server/db/payments.ts
import { eq as eq4 } from "drizzle-orm";
import { TRPCError as TRPCError2 } from "@trpc/server";
var log4 = createLogger("payments");
async function createPayment(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(payments).values(data);
  return result;
}
async function getPaymentsByApartment(apartmentId, month) {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq, and: drizzleAnd } = await import("drizzle-orm");
  let query = db.select({
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
    updatedAt: payments.updatedAt
  }).from(payments).innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id)).where(drizzleEq(payments.apartmentId, apartmentId));
  if (month) {
    query = db.select({
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
      updatedAt: payments.updatedAt
    }).from(payments).innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id)).where(drizzleAnd(drizzleEq(payments.apartmentId, apartmentId), drizzleEq(payments.month, month)));
  }
  return await query;
}
async function getPendingPayments(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { eq: drizzleEq, desc: desc6 } = await import("drizzle-orm");
  try {
    const data = await db.select({
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
      updatedAt: payments.updatedAt
    }).from(payments).innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id)).where(drizzleEq(payments.status, "pending")).orderBy(desc6(payments.createdAt)).limit(limit).offset(offset);
    return { data, total: data.length };
  } catch (error) {
    log4.error({ err: error }, "[Payments] Error fetching pending payments:");
    return { data: [], total: 0 };
  }
}
async function updatePaymentStatus(id, status, reviewedBy, notes) {
  const db = await getDb();
  if (!db) return null;
  const data = {
    status,
    reviewedAt: /* @__PURE__ */ new Date(),
    reviewedBy
  };
  if (notes) {
    data.notes = notes;
  }
  return await db.update(payments).set(data).where(eq4(payments.id, id));
}
async function getPaymentById(id) {
  const db = await getDb();
  if (!db) return null;
  const { eq: drizzleEq } = await import("drizzle-orm");
  const result = await db.select().from(payments).where(drizzleEq(payments.id, id));
  return result.length > 0 ? result[0] : null;
}
async function applyPaymentToDebts(apartmentId, paymentAmount, tx) {
  const db = tx ?? await getDb();
  if (!db) return null;
  const { eq: drizzleEq, and: and7 } = await import("drizzle-orm");
  try {
    const pendingDebts = await db.select().from(monthlyDebts).where(and7(
      drizzleEq(monthlyDebts.apartmentId, apartmentId),
      drizzleEq(monthlyDebts.isPaid, false)
    )).orderBy(monthlyDebts.month);
    let remainingPayment = paymentAmount;
    let appliedTotal = 0;
    for (const debt of pendingDebts) {
      if (remainingPayment <= 0) break;
      const debtAmount = parseFloat(debt.pendingAmount);
      const currentPaid = parseFloat(debt.totalPaid ?? "0") || 0;
      if (remainingPayment >= debtAmount) {
        remainingPayment -= debtAmount;
        appliedTotal += debtAmount;
        await db.update(monthlyDebts).set({
          pendingAmount: "0.00",
          totalPaid: debt.totalDue,
          isPaid: true
        }).where(drizzleEq(monthlyDebts.id, debt.id));
      } else if (remainingPayment > 0) {
        const newPending = (debtAmount - remainingPayment).toFixed(2);
        const newPaid = (currentPaid + remainingPayment).toFixed(2);
        appliedTotal += remainingPayment;
        await db.update(monthlyDebts).set({
          pendingAmount: newPending,
          totalPaid: newPaid
        }).where(drizzleEq(monthlyDebts.id, debt.id));
        remainingPayment = 0;
      }
    }
    let creditCreated = 0;
    if (remainingPayment > 5e-3) {
      const apartment = await db.select().from(apartments).where(drizzleEq(apartments.id, apartmentId)).limit(1);
      if (apartment.length > 0) {
        const currentCredit = parseFloat(apartment[0].creditBalance || "0") || 0;
        creditCreated = remainingPayment;
        const newCredit = (currentCredit + remainingPayment).toFixed(2);
        await db.update(apartments).set({ creditBalance: newCredit }).where(drizzleEq(apartments.id, apartmentId));
      }
    }
    return { success: true, appliedAmount: appliedTotal, creditCreated };
  } catch (error) {
    log4.error({ err: error }, "[Payment Liquidation] Error applying payment to debts:");
    return { success: false, appliedAmount: 0, creditCreated: 0 };
  }
}
async function validatePaymentAmount(apartmentId, paymentAmount, tx) {
  const db = tx ?? await getDb();
  if (!db) return { valid: false, reason: "Base de datos no disponible" };
  const { eq: drizzleEq, and: and7 } = await import("drizzle-orm");
  try {
    if (!paymentAmount || paymentAmount <= 0) {
      return { valid: false, reason: "El monto del pago debe ser mayor a cero" };
    }
    const pendingDebts = await db.select().from(monthlyDebts).where(and7(
      drizzleEq(monthlyDebts.apartmentId, apartmentId),
      drizzleEq(monthlyDebts.isPaid, false)
    ));
    const apartment = await db.select({ id: apartments.id }).from(apartments).where(drizzleEq(apartments.id, apartmentId)).limit(1);
    if (apartment.length === 0) {
      return { valid: false, reason: "Apartamento no encontrado" };
    }
    const totalPending = pendingDebts.reduce(
      (sum, debt) => {
        const pending = parseFloat(debt.pendingAmount || "0") || 0;
        return sum + pending;
      },
      0
    );
    if (paymentAmount > totalPending + 0.01) {
      log4.info(
        { apartmentId, paymentAmount, totalPending },
        "[Payment Validation] Payment exceeds pending debt \u2014 excess will become credit balance"
      );
    }
    return { valid: true };
  } catch (error) {
    log4.error({ err: error }, "[Payment Validation] Error validating payment amount:");
    return { valid: false, reason: "Error al validar el monto" };
  }
}
function validatePaymentMonth(paymentMonth) {
  try {
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(paymentMonth)) {
      return {
        valid: false,
        reason: "Formato de mes inv\xE1lido. Use YYYY-MM"
      };
    }
    const [year, month] = paymentMonth.split("-");
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return {
        valid: false,
        reason: "Mes inv\xE1lido. Debe estar entre 01 y 12"
      };
    }
    const today = /* @__PURE__ */ new Date();
    if (yearNum < today.getFullYear() - 10) {
      return {
        valid: false,
        reason: "Mes muy antiguo. Debe estar dentro de los \xFAltimos 10 a\xF1os"
      };
    }
    if (yearNum > today.getFullYear() + 1) {
      return {
        valid: false,
        reason: "A\xF1o inv\xE1lido. No se pueden cargar pagos demasiado en el futuro"
      };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: "Formato de mes inv\xE1lido. Use YYYY-MM"
    };
  }
}
async function approvePaymentWithValidations(paymentId, reviewedBy, notes) {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Base de datos no disponible" };
  }
  try {
    return await db.transaction(async (tx) => {
      const [payment] = await tx.select().from(payments).where(eq4(payments.id, paymentId)).for("update");
      if (!payment) {
        return { success: false, message: "Pago no encontrado" };
      }
      const paymentAmount = parseFloat(payment.amount);
      const monthValidation = validatePaymentMonth(payment.month);
      if (!monthValidation.valid) {
        return { success: false, message: monthValidation.reason || "Fecha inv\xE1lida" };
      }
      const amountValidation = await validatePaymentAmount(payment.apartmentId, paymentAmount, tx);
      if (!amountValidation.valid) {
        return { success: false, message: amountValidation.reason || "Monto inv\xE1lido" };
      }
      await tx.update(payments).set({
        status: "approved",
        reviewedAt: /* @__PURE__ */ new Date(),
        reviewedBy,
        notes: notes || null
      }).where(eq4(payments.id, paymentId));
      const liquidationResult = await applyPaymentToDebts(payment.apartmentId, paymentAmount, tx);
      if (!liquidationResult || !liquidationResult.success) {
        throw new TRPCError2({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al liquidar las deudas \u2014 transacci\xF3n revertida"
        });
      }
      await tx.insert(auditLog).values({
        userId: reviewedBy,
        action: "approve_payment",
        entityType: "payment",
        entityId: paymentId,
        details: `Pago aprobado: $${paymentAmount.toFixed(2)} - ${notes || "Sin notas"}`
      });
      return {
        success: true,
        message: liquidationResult?.creditCreated && liquidationResult.creditCreated > 5e-3 ? `Pago aprobado exitosamente: $${(liquidationResult.appliedAmount || 0).toFixed(2)} aplicados a deuda y $${liquidationResult.creditCreated.toFixed(2)} como saldo a favor` : "Pago aprobado exitosamente",
        appliedAmount: liquidationResult?.appliedAmount,
        creditCreated: liquidationResult?.creditCreated
      };
    });
  } catch (error) {
    if (error instanceof TRPCError2) {
      return { success: false, message: error.message };
    }
    log4.error({ err: error }, "[Payment Approval] Error approving payment:");
    return { success: false, message: "Error al aprobar el pago" };
  }
}
async function uploadPaymentVoucher(paymentId, fileBuffer, fileName, mimeType) {
  const { createPresignedUploadUrl: createPresignedUploadUrl2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
  try {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
    }
    const maxSize = 5 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      throw new Error(`Archivo muy grande. M\xE1ximo: 5MB`);
    }
    const timestamp2 = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const extension = getFileExtension(mimeType);
    const s3Key = `payments/${paymentId}/${timestamp2}-${randomSuffix}.${extension}`;
    const { signedUrl, publicUrl } = await createPresignedUploadUrl2(s3Key);
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: fileBuffer,
      headers: { "Content-Type": mimeType }
    });
    if (!response.ok) {
      throw new Error(`Error subiendo archivo: ${response.statusText}`);
    }
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    await db.update(payments).set({
      voucherImageUrl: publicUrl,
      voucherImageKey: s3Key,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(payments.id, paymentId));
    return { url: publicUrl, key: s3Key };
  } catch (error) {
    log4.error({ err: error }, "[S3] Error uploading voucher:");
    throw error;
  }
}
async function getPaymentVoucherUrl(paymentId) {
  const db = await getDb();
  if (!db) return null;
  try {
    const payment = await db.select({ voucherImageUrl: payments.voucherImageUrl }).from(payments).where(eq4(payments.id, paymentId)).limit(1);
    return payment[0]?.voucherImageUrl || null;
  } catch (error) {
    log4.error({ err: error }, "[S3] Error getting voucher URL:");
    return null;
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf"
  };
  return mimeToExt[mimeType] || "bin";
}

// server/db/debts.ts
import { and as and4, asc as asc2, eq as eq5, inArray as inArray2 } from "drizzle-orm";
var log5 = createLogger("debts");
async function getDebtsByMonth(month) {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq } = await import("drizzle-orm");
  const result = await db.select({
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
    updatedAt: monthlyDebts.updatedAt
  }).from(monthlyDebts).innerJoin(apartments, drizzleEq(monthlyDebts.apartmentId, apartments.id)).where(drizzleEq(monthlyDebts.month, month));
  return result;
}
async function getAllUserDebts(userId) {
  const db = await getDb();
  if (!db) return [];
  const user = await getUserById(userId);
  if (!user || !user.apartmentId) return [];
  const { eq: drizzleEq } = await import("drizzle-orm");
  const result = await db.select({
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
    creditBalance: apartments.creditBalance
  }).from(monthlyDebts).innerJoin(apartments, drizzleEq(monthlyDebts.apartmentId, apartments.id)).where(drizzleEq(monthlyDebts.apartmentId, user.apartmentId));
  return result;
}
async function getApartmentPendingDebt(apartmentId) {
  const db = await getDb();
  if (!db) return 0;
  const { eq: drizzleEq, sql: sql4 } = await import("drizzle-orm");
  const result = await db.select({
    totalPending: sql4`COALESCE(SUM(${monthlyDebts.pendingAmount}), 0)`
  }).from(monthlyDebts).where(drizzleEq(monthlyDebts.apartmentId, apartmentId));
  return parseFloat(result[0]?.totalPending || "0") || 0;
}
async function applyCreditToDebt(db, debt, apt) {
  const pending = parseFloat(debt.pendingAmount);
  if (!pending || pending <= 0) return;
  const credit = parseFloat(apt.creditBalance || "0") || 0;
  if (credit <= 0) return;
  const creditToApply = Math.min(credit, pending);
  const newPending = pending - creditToApply;
  const newCredit = credit - creditToApply;
  await db.update(apartments).set({ creditBalance: newCredit.toFixed(2) }).where(eq5(apartments.id, apt.id));
  await db.update(monthlyDebts).set({
    pendingAmount: newPending.toFixed(2),
    isPaid: newPending <= 5e-3
  }).where(eq5(monthlyDebts.id, debt.id));
  log5.info(
    { apartmentId: apt.id, month: debt.month, creditToApply, newPending },
    "[Debt Generation] Applied credit balance to debt"
  );
}
async function generateDebtsFromCharge(chargeId) {
  const db = await getDb();
  if (!db) return;
  try {
    const charge = await db.select().from(charges).where(eq5(charges.id, chargeId)).limit(1);
    if (!charge || charge.length === 0) {
      log5.error(`[Debt Generation] Charge ${chargeId} not found`);
      return;
    }
    const chargeData = charge[0];
    const currentMonth = /* @__PURE__ */ new Date();
    const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    const chargeAmount = parseFloat(chargeData.amount);
    if (chargeData.apartmentId) {
      const existingDebt = await db.select().from(monthlyDebts).where(
        and4(
          eq5(monthlyDebts.apartmentId, chargeData.apartmentId),
          eq5(monthlyDebts.month, month)
        )
      ).limit(1);
      if (existingDebt && existingDebt.length > 0) {
        const debt = existingDebt[0];
        const totalDue = parseFloat(debt.totalDue) + chargeAmount;
        const pendingAmount = parseFloat(debt.pendingAmount) + chargeAmount;
        await db.update(monthlyDebts).set({
          totalDue: totalDue.toString(),
          pendingAmount: pendingAmount.toString()
        }).where(eq5(monthlyDebts.id, debt.id));
      } else {
        await db.insert(monthlyDebts).values({
          apartmentId: chargeData.apartmentId,
          chargeId,
          month,
          totalDue: chargeAmount.toString(),
          pendingAmount: chargeAmount.toString(),
          isPaid: false
        });
      }
      const creditApt = await db.select({ id: apartments.id, creditBalance: apartments.creditBalance }).from(apartments).where(eq5(apartments.id, chargeData.apartmentId)).limit(1);
      if (creditApt.length > 0 && (parseFloat(creditApt[0].creditBalance || "0") || 0) > 0) {
        const freshDebt = await db.select().from(monthlyDebts).where(
          and4(
            eq5(monthlyDebts.apartmentId, chargeData.apartmentId),
            eq5(monthlyDebts.month, month)
          )
        ).limit(1);
        if (freshDebt.length > 0) {
          await applyCreditToDebt(db, freshDebt[0], creditApt[0]);
        }
      }
    } else {
      const allApartments = await db.select().from(apartments);
      if (allApartments.length === 0) return;
      const apartmentIds = allApartments.map((a) => a.id);
      const existingDebts = await db.select().from(monthlyDebts).where(
        and4(
          eq5(monthlyDebts.month, month),
          inArray2(monthlyDebts.apartmentId, apartmentIds)
        )
      );
      const debtMap = new Map(existingDebts.map((d) => [d.apartmentId, d]));
      const toInsert = [];
      for (const apt of allApartments) {
        const existing = debtMap.get(apt.id);
        if (existing) {
          const totalDue = parseFloat(existing.totalDue) + chargeAmount;
          const pendingAmount = parseFloat(existing.pendingAmount) + chargeAmount;
          await db.update(monthlyDebts).set({
            totalDue: totalDue.toString(),
            pendingAmount: pendingAmount.toString()
          }).where(eq5(monthlyDebts.id, existing.id));
        } else {
          toInsert.push({
            apartmentId: apt.id,
            chargeId,
            month,
            totalDue: chargeAmount.toString(),
            pendingAmount: chargeAmount.toString(),
            isPaid: false
          });
        }
      }
      if (toInsert.length > 0) {
        await db.insert(monthlyDebts).values(toInsert);
      }
      const aptsWithCredit = allApartments.filter(
        (a) => (parseFloat(a.creditBalance || "0") || 0) > 0
      );
      if (aptsWithCredit.length > 0) {
        const creditAptIds = aptsWithCredit.map((a) => a.id);
        const creditDebts = await db.select().from(monthlyDebts).where(
          and4(
            eq5(monthlyDebts.month, month),
            inArray2(monthlyDebts.apartmentId, creditAptIds)
          )
        );
        const creditDebtMap = new Map(creditDebts.map((d) => [d.apartmentId, d]));
        for (const apt of aptsWithCredit) {
          const debt = creditDebtMap.get(apt.id);
          if (debt) {
            await applyCreditToDebt(db, debt, apt);
          }
        }
      }
    }
    log5.info(`[Debt Generation] Successfully generated debts for charge ${chargeId}`);
  } catch (error) {
    log5.error({ err: error }, `[Debt Generation] Error generating debts for charge ${chargeId}:`);
  }
}
async function getAllApartmentsWithDebtStatus(month, sortBy = "floor") {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq, asc: asc4 } = await import("drizzle-orm");
  const allApts = await db.select().from(apartments).orderBy(asc4(apartments.id));
  const debts = await db.select({
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
    floorId: apartments.floorId
  }).from(monthlyDebts).innerJoin(apartments, drizzleEq(monthlyDebts.apartmentId, apartments.id)).where(drizzleEq(monthlyDebts.month, month));
  const debtMap = new Map(debts.map((d) => [d.apartmentId, d]));
  const allFloors = await db.select().from(floors);
  const floorMap = new Map(allFloors.map((f) => [f.id, f]));
  const result = allApts.map((apt) => {
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
      isPaid: debt?.isPaid ?? true,
      // Si no hay deuda, considerarlo pagado
      createdAt: debt?.createdAt,
      updatedAt: debt?.updatedAt,
      floorId: apt.floorId,
      floorName: floor?.floorName || `Piso ${floor?.floorNumber}`,
      apartmentNumber: apt.apartmentNumber,
      creditBalance: apt.creditBalance || "0.00"
      // saldo a favor del apartamento
    };
  });
  if (sortBy === "name") {
    result.sort((a, b) => (a.unitName || "").localeCompare(b.unitName || ""));
  } else if (sortBy === "status") {
    result.sort((a, b) => {
      if (a.isPaid === b.isPaid) {
        return (a.unitName || "").localeCompare(b.unitName || "");
      }
      return a.isPaid ? 1 : -1;
    });
  } else {
    result.sort((a, b) => {
      if (a.floorId !== b.floorId) {
        return a.floorId - b.floorId;
      }
      return a.apartmentNumber.localeCompare(b.apartmentNumber);
    });
  }
  return result;
}
function computeDebtSummary(debts) {
  const totalApartments = debts.length;
  const apartmentsWithDebt = debts.filter((d) => !d.isPaid);
  const apartmentsWithoutDebt = totalApartments - apartmentsWithDebt.length;
  const totalPending = apartmentsWithDebt.reduce(
    (sum, d) => sum + parseFloat(String(d.pendingAmount)),
    0
  );
  const totalDue = debts.reduce(
    (sum, d) => sum + parseFloat(String(d.totalDue)),
    0
  );
  return { totalApartments, apartmentsWithDebt, apartmentsWithoutDebt, totalPending, totalDue };
}

// server/db/notifications.ts
import { and as and5, desc as desc4 } from "drizzle-orm";
var log6 = createLogger("notifications");
async function createNotification(data) {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.insert(notifications).values(data);
  } catch (error) {
    log6.error({ err: error }, "[Notifications] Error creating notification:");
    return null;
  }
}
async function getUnreadNotifications(userId) {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq } = await import("drizzle-orm");
  try {
    return await db.select().from(notifications).where(
      and5(
        drizzleEq(notifications.userId, userId),
        drizzleEq(notifications.isRead, false)
      )
    ).orderBy(desc4(notifications.createdAt));
  } catch (error) {
    log6.error({ err: error }, "[Notifications] Error getting unread notifications:");
    return [];
  }
}
async function getUserNotifications(userId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq } = await import("drizzle-orm");
  try {
    return await db.select().from(notifications).where(drizzleEq(notifications.userId, userId)).orderBy(desc4(notifications.createdAt)).limit(limit);
  } catch (error) {
    log6.error({ err: error }, "[Notifications] Error getting user notifications:");
    return [];
  }
}
async function markNotificationAsRead(notificationId) {
  const db = await getDb();
  if (!db) return null;
  const { eq: drizzleEq } = await import("drizzle-orm");
  try {
    return await db.update(notifications).set({
      isRead: true,
      readAt: /* @__PURE__ */ new Date()
    }).where(drizzleEq(notifications.id, notificationId));
  } catch (error) {
    log6.error({ err: error }, "[Notifications] Error marking notification as read:");
    return null;
  }
}
async function markAllNotificationsAsRead(userId) {
  const db = await getDb();
  if (!db) return null;
  const { eq: drizzleEq } = await import("drizzle-orm");
  try {
    return await db.update(notifications).set({
      isRead: true,
      readAt: /* @__PURE__ */ new Date()
    }).where(
      and5(
        drizzleEq(notifications.userId, userId),
        drizzleEq(notifications.isRead, false)
      )
    );
  } catch (error) {
    log6.error({ err: error }, "[Notifications] Error marking all notifications as read:");
    return null;
  }
}
async function countUnreadNotifications(userId) {
  const db = await getDb();
  if (!db) return 0;
  const { eq: drizzleEq, sql: sql4 } = await import("drizzle-orm");
  try {
    const result = await db.select({ count: sql4`COUNT(*)` }).from(notifications).where(
      and5(
        drizzleEq(notifications.userId, userId),
        drizzleEq(notifications.isRead, false)
      )
    );
    return parseInt(result[0]?.count) || 0;
  } catch (error) {
    log6.error({ err: error }, "[Notifications] Error counting unread notifications:");
    return 0;
  }
}
async function notifyPaymentApproved(userId, paymentId, amount, currency) {
  return createNotification({
    userId,
    type: "payment_approved",
    title: "Pago Aprobado",
    message: `Tu pago de ${currency} ${parseFloat(amount).toFixed(2)} ha sido aprobado exitosamente.`,
    relatedEntityType: "payment",
    relatedEntityId: paymentId,
    actionUrl: `/user/payments/${paymentId}`
  });
}
async function notifyPaymentRejected(userId, paymentId, reason) {
  return createNotification({
    userId,
    type: "payment_rejected",
    title: "Pago Rechazado",
    message: `Tu pago ha sido rechazado. Raz\xF3n: ${reason}`,
    relatedEntityType: "payment",
    relatedEntityId: paymentId,
    actionUrl: `/user/payments/${paymentId}`
  });
}

// server/db/reminders.ts
import { eq as eq7 } from "drizzle-orm";
async function createReminder(data) {
  const db = await getDb();
  if (!db) return null;
  return await db.insert(reminders).values(data);
}
async function getPendingReminders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reminders).where(eq7(reminders.status, "pending"));
}
async function updateReminderStatus(id, status) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(reminders).set({ status, sentAt: /* @__PURE__ */ new Date() }).where(eq7(reminders.id, id));
}

// server/db/audit.ts
async function createAuditLog(data) {
  const db = await getDb();
  if (!db) return null;
  return await db.insert(auditLog).values(data);
}

// server/db/reports.ts
import { and as and6, asc as asc3, desc as desc5, eq as eq8 } from "drizzle-orm";
var log7 = createLogger("reports");
async function getMonthlyReportData(apartmentId, month) {
  const db = await getDb();
  if (!db) return null;
  try {
    const apartment = await db.select().from(apartments).where(eq8(apartments.id, apartmentId)).limit(1);
    if (!apartment[0]) return null;
    const monthPayments = await db.select().from(payments).where(
      and6(
        eq8(payments.apartmentId, apartmentId),
        eq8(payments.month, month)
      )
    );
    const monthDebts = await db.select().from(monthlyDebts).where(
      and6(
        eq8(monthlyDebts.apartmentId, apartmentId),
        eq8(monthlyDebts.month, month)
      )
    );
    const config = await getCondominiumConfig();
    return {
      apartment: apartment[0],
      payments: monthPayments,
      debts: monthDebts,
      config,
      month
    };
  } catch (error) {
    log7.error({ err: error }, "[Reports] Error getting monthly report data:");
    return null;
  }
}
async function getUserPaymentsSummary(userId, limit = 12) {
  const db = await getDb();
  if (!db) return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
  try {
    const user = await db.select().from(users).where(eq8(users.id, userId)).limit(1);
    if (!user[0] || !user[0].apartmentId) {
      return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
    }
    const userPayments = await db.select().from(payments).where(eq8(payments.apartmentId, user[0].apartmentId)).orderBy(desc5(payments.submittedAt)).limit(limit);
    const userDebts = await db.select().from(monthlyDebts).where(
      and6(
        eq8(monthlyDebts.apartmentId, user[0].apartmentId),
        eq8(monthlyDebts.isPaid, false)
      )
    ).orderBy(asc3(monthlyDebts.month));
    const totalPaid = userPayments.filter((p) => p.status === "approved").reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    const totalPending = userDebts.reduce((sum, d) => sum + parseFloat(d.pendingAmount || "0"), 0);
    return {
      payments: userPayments,
      debts: userDebts,
      totalPaid: totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2)
    };
  } catch (error) {
    log7.error({ err: error }, "[Reports] Error getting user payments summary:");
    return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
  }
}
async function getMonthlyDebtsSummary(month) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(monthlyDebts).where(eq8(monthlyDebts.month, month)).orderBy(desc5(monthlyDebts.pendingAmount));
  } catch (error) {
    log7.error({ err: error }, "[Reports] Error getting monthly debts summary:");
    return [];
  }
}
async function getPaymentsByStatus(status, month) {
  const db = await getDb();
  if (!db) return [];
  try {
    let query = db.select().from(payments).where(eq8(payments.status, status));
    if (month) {
      query = db.select().from(payments).where(
        and6(
          eq8(payments.status, status),
          eq8(payments.month, month)
        )
      );
    }
    return await query.orderBy(desc5(payments.submittedAt));
  } catch (error) {
    log7.error({ err: error }, "[Reports] Error getting payments by status:");
    return [];
  }
}
async function generateReportJSON(apartmentId, month) {
  const reportData = await getMonthlyReportData(apartmentId, month);
  if (!reportData) return null;
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    apartment: {
      id: reportData.apartment.id,
      number: reportData.apartment.apartmentNumber,
      name: reportData.apartment.unitName
    },
    month: reportData.month,
    payments: reportData.payments.map((p) => ({
      id: p.id,
      voucherNumber: p.voucherNumber,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt
    })),
    debts: reportData.debts.map((d) => ({
      id: d.id,
      month: d.month,
      totalDue: d.totalDue,
      pendingAmount: d.pendingAmount,
      isPaid: d.isPaid,
      createdAt: d.createdAt
    })),
    summary: {
      totalPayments: reportData.payments.length,
      approvedPayments: reportData.payments.filter((p) => p.status === "approved").length,
      totalDebts: reportData.debts.length,
      paidDebts: reportData.debts.filter((d) => d.isPaid).length,
      totalAmount: reportData.debts.reduce((sum, d) => sum + parseFloat(d.totalDue || "0"), 0).toFixed(2),
      totalPending: reportData.debts.reduce((sum, d) => sum + parseFloat(d.pendingAmount || "0"), 0).toFixed(2)
    }
  };
}

// server/exports.ts
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
async function generatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - 2 * margin;
      const addHeader = () => {
        doc.fontSize(16).font("Helvetica-Bold").text(data.condominiumName, { align: "center" });
        doc.fontSize(11).font("Helvetica").text("Estado de Pagos por Apartamento", { align: "center" });
        doc.fontSize(9).text(`Mes: ${data.month}`, { align: "center" });
        doc.moveDown(0.5);
      };
      addHeader();
      doc.fontSize(10).font("Helvetica-Bold").text("Resumen:");
      doc.fontSize(9).font("Helvetica");
      doc.text(`Total de Apartamentos: ${data.summary.total}`);
      doc.text(`Pagados: ${data.summary.paid}`);
      doc.text(`Pendientes: ${data.summary.pending}`);
      doc.text(`Total Adeudado: $${data.summary.totalDue.toFixed(2)}`);
      doc.text(`Total Pendiente: $${data.summary.totalPending.toFixed(2)}`);
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica-Bold").text("Detalle de Apartamentos:");
      doc.moveDown(0.3);
      const colWidths = [80, 90, 90, 90];
      const rowHeight = 20;
      const headerHeight = 20;
      let currentY = doc.y;
      const drawTableHeader = () => {
        const headers = ["Apartamento", "Deuda Total", "Pendiente", "Estado"];
        let x = margin;
        const y = doc.y;
        doc.fontSize(8).font("Helvetica-Bold");
        headers.forEach((header, i) => {
          doc.text(header, x, y, { width: colWidths[i], align: "left" });
          x += colWidths[i];
        });
        doc.moveTo(margin, y + headerHeight - 5).lineTo(pageWidth - margin, y + headerHeight - 5).stroke();
        doc.moveDown(1.2);
      };
      drawTableHeader();
      doc.fontSize(8).font("Helvetica");
      data.debts.forEach((debt, index2) => {
        if (doc.y + rowHeight > pageHeight - margin - 30) {
          doc.addPage();
          addHeader();
          doc.moveDown(0.3);
          drawTableHeader();
        }
        let x = margin;
        const y = doc.y;
        doc.text(debt.apartmentName, x, y, { width: colWidths[0], align: "left" });
        x += colWidths[0];
        doc.text(`$${parseFloat(debt.totalDue).toFixed(2)}`, x, y, { width: colWidths[1], align: "right" });
        x += colWidths[1];
        doc.text(`$${parseFloat(debt.pendingAmount).toFixed(2)}`, x, y, { width: colWidths[2], align: "right" });
        x += colWidths[2];
        const status = debt.isPaid ? "Pagado" : "Pendiente";
        doc.text(status, x, y, { width: colWidths[3], align: "left" });
        doc.moveDown(1);
      });
      doc.moveDown();
      doc.fontSize(7).font("Helvetica").text(
        `Generado: ${(/* @__PURE__ */ new Date()).toLocaleString("es-ES")}`,
        { align: "right" }
      );
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
async function generateExcel(data) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Estado de Pagos");
  worksheet.mergeCells("A1:D1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = data.condominiumName;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells("A2:D2");
  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = "Estado de Pagos por Apartamento";
  subtitleCell.font = { size: 12, bold: true };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells("A3:D3");
  const monthCell = worksheet.getCell("A3");
  monthCell.value = `Mes: ${data.month}`;
  monthCell.alignment = { horizontal: "center" };
  worksheet.addRow([]);
  worksheet.getCell("A5").value = "Resumen:";
  worksheet.getCell("A5").font = { bold: true };
  worksheet.getCell("A6").value = "Total de Apartamentos:";
  worksheet.getCell("B6").value = data.summary.total;
  worksheet.getCell("A7").value = "Pagados:";
  worksheet.getCell("B7").value = data.summary.paid;
  worksheet.getCell("A8").value = "Pendientes:";
  worksheet.getCell("B8").value = data.summary.pending;
  worksheet.getCell("A9").value = "Total Adeudado:";
  worksheet.getCell("B9").value = data.summary.totalDue;
  worksheet.getCell("B9").numFmt = "$#,##0.00";
  worksheet.getCell("A10").value = "Total Pendiente:";
  worksheet.getCell("B10").value = data.summary.totalPending;
  worksheet.getCell("B10").numFmt = "$#,##0.00";
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(["Apartamento", "Deuda Total", "Pendiente", "Estado"]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" }
  };
  data.debts.forEach((debt) => {
    const row = worksheet.addRow([
      debt.apartmentName,
      parseFloat(debt.totalDue),
      parseFloat(debt.pendingAmount),
      debt.isPaid ? "Pagado" : "Pendiente"
    ]);
    row.getCell(2).numFmt = "$#,##0.00";
    row.getCell(3).numFmt = "$#,##0.00";
  });
  worksheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 }
  ];
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// server/routers.ts
init_supabase();
init_storage();
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Solo administradores pueden acceder" });
  }
  return next({ ctx });
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        apartmentId: user.apartmentId,
        approvalStatus: user.approvalStatus,
        isActive: user.isActive,
        createdAt: user.createdAt
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    setSessionCookie: publicProcedure.input(z2.object({ accessToken: z2.string() })).mutation(async ({ ctx, input }) => {
      const supabaseUser = await verifySupabaseToken(input.accessToken);
      if (!supabaseUser) {
        throw new TRPCError3({
          code: "UNAUTHORIZED",
          message: "Token inv\xE1lido o expirado"
        });
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, input.accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7
        // 7 días
      });
      return { success: true };
    })
  }),
  // ===== CONFIGURACIÓN DEL CONDOMINIO =====
  config: router({
    get: protectedProcedure.query(async () => {
      const config = await getCondominiumConfig();
      if (!config) {
        return await initializeCondominiumConfig();
      }
      return config;
    }),
    update: adminProcedure2.input(z2.object({
      name: z2.string().optional(),
      floors: z2.number().min(1).max(20).optional(),
      apartmentsPerFloor: z2.number().min(1).max(50).optional(),
      baseFee: z2.string().optional(),
      defaultCurrency: z2.enum(["USD", "VES"]).optional(),
      exchangeRate: z2.string().optional(),
      reminderDay: z2.number().min(1).max(28).optional(),
      apartmentNamePattern: z2.string().optional()
    })).mutation(async ({ input }) => {
      const result = await updateCondominiumConfig(input);
      return await getCondominiumConfig();
    }),
    initializeStructure: adminProcedure2.mutation(async () => {
      await initializeFloorsAndApartments();
      return { success: true };
    }),
    generateApartmentNames: adminProcedure2.input(z2.object({ pattern: z2.string().optional() })).mutation(async ({ input }) => {
      const result = await generateAllApartmentNames(input.pattern);
      return result || { success: false };
    }),
    getPatternExamples: adminProcedure2.input(z2.object({ pattern: z2.string() })).query(async ({ input }) => {
      const config = await getCondominiumConfig();
      if (!config) return [];
      return generatePatternExamples(input.pattern, config.floors || 5, config.apartmentsPerFloor || 6);
    })
  }),
  // ===== GESTIÓN DE PISOS Y APARTAMENTOS =====
  floors: router({
    list: protectedProcedure.query(async () => {
      return await getAllFloors();
    }),
    withApartments: protectedProcedure.query(async () => {
      const floors2 = await getAllFloors();
      const apartments2 = await getAllApartments();
      return floors2.map((floor) => ({
        ...floor,
        apartments: apartments2.filter((apt) => apt.floorId === floor.id)
      }));
    })
  }),
  apartments: router({
    list: protectedProcedure.query(async () => {
      return await getAllApartments();
    }),
    byFloor: protectedProcedure.input(z2.object({ floorId: z2.number() })).query(async ({ input }) => {
      return await getApartmentsByFloor(input.floorId);
    }),
    updateName: adminProcedure2.input(z2.object({
      apartmentId: z2.number(),
      name: z2.string().trim().min(1, "El nombre del apartamento no puede estar vac\xEDo").max(100)
    })).mutation(async ({ input, ctx }) => {
      await updateApartmentName(input.apartmentId, input.name);
      await createAuditLog({
        userId: ctx.user.id,
        action: "update_apartment_name",
        entityType: "apartment",
        entityId: input.apartmentId,
        details: `Nombre actualizado a: ${input.name}`
      });
      return { success: true };
    })
  }),
  // ===== GESTIÓN DE COBROS =====
  charges: router({
    list: protectedProcedure.query(async () => {
      return await getAllCharges();
    }),
    create: adminProcedure2.input(z2.object({
      name: z2.string().min(1),
      description: z2.string().optional(),
      amount: z2.string().refine(
        (val) => {
          const n = parseFloat(val);
          return !isNaN(n) && n > 0;
        },
        { message: "El monto debe ser un n\xFAmero positivo mayor a cero" }
      ),
      currency: z2.enum(["USD", "VES"]).default("USD"),
      isRecurring: z2.boolean().default(true),
      apartmentId: z2.number().optional()
    })).mutation(async ({ input, ctx }) => {
      const config = await getCondominiumConfig();
      const exchangeRate = config ? parseFloat(config.exchangeRate || "1") : 1;
      let amountInUSD = parseFloat(input.amount);
      if (input.currency === "VES" && exchangeRate > 0) {
        amountInUSD = amountInUSD / exchangeRate;
      }
      if (isNaN(amountInUSD) || amountInUSD <= 0) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "El monto debe ser un n\xFAmero positivo mayor a cero" });
      }
      const result = await createCharge({
        name: input.name,
        description: input.description,
        amount: amountInUSD.toFixed(2),
        currency: "USD",
        // Siempre guardar en USD
        isRecurring: input.isRecurring,
        isActive: true,
        apartmentId: input.apartmentId || null
      });
      if (result && result.id) {
        await generateDebtsFromCharge(result.id);
      }
      await createAuditLog({
        userId: ctx.user.id,
        action: "create_charge",
        details: `Creo cobro: ${input.name}`
      });
      return { success: true };
    }),
    update: adminProcedure2.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      description: z2.string().optional(),
      amount: z2.string().refine(
        (val) => {
          const n = parseFloat(val);
          return !isNaN(n) && n > 0;
        },
        { message: "El monto debe ser un n\xFAmero positivo mayor a cero" }
      ).optional(),
      currency: z2.enum(["USD", "VES"]).optional(),
      isRecurring: z2.boolean().optional()
      // El alcance (individual/global/apto) es INMUTABLE en edición:
      // si cambia, se crea/elimina el cobro. No se acepta apartmentId aquí.
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      if (data.amount !== void 0) {
        const config = await getCondominiumConfig();
        const exchangeRate = config ? parseFloat(config.exchangeRate || "1") : 1;
        let amountInUSD = parseFloat(data.amount);
        const currency = data.currency ?? "USD";
        if (currency === "VES" && exchangeRate > 0) {
          amountInUSD = amountInUSD / exchangeRate;
        }
        if (isNaN(amountInUSD) || amountInUSD <= 0) {
          throw new TRPCError3({ code: "BAD_REQUEST", message: "El monto debe ser un n\xFAmero positivo mayor a cero" });
        }
        data.amount = amountInUSD.toFixed(2);
        data.currency = "USD";
      }
      await updateCharge(id, data);
      await createAuditLog({
        userId: ctx.user.id,
        action: "update_charge",
        details: `Edit\xF3 cobro: ${data.name ?? id}`
      });
      return { success: true };
    }),
    delete: adminProcedure2.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      try {
        await deleteCharge(input.id);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "No se pudo eliminar el cobro"
        });
      }
    })
  }),
  // ===== GESTIÓN DE PAGOS =====
  payments: router({
    submit: protectedProcedure.input(z2.object({
      month: z2.string(),
      // "2026-03"
      voucherNumber: z2.string().optional(),
      voucherImage: z2.string().optional(),
      // Base64
      amount: z2.string().refine(
        (val) => {
          const n = parseFloat(val);
          return !isNaN(n) && n > 0;
        },
        { message: "El monto debe ser un n\xFAmero positivo mayor a cero" }
      ),
      currency: z2.enum(["USD", "VES"])
    })).mutation(async ({ input, ctx }) => {
      if (!ctx.user.apartmentId) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Usuario no tiene apartamento asignado" });
      }
      const amountNum = parseFloat(input.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "El monto debe ser un n\xFAmero positivo mayor a cero" });
      }
      const pendingDebt = await getApartmentPendingDebt(ctx.user.apartmentId);
      if (amountNum > pendingDebt + 5e-3) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: `El monto (${amountNum.toFixed(2)}) excede tu deuda pendiente (${pendingDebt.toFixed(2)}). Solo puedes pagar hasta lo que debes.`
        });
      }
      const result = await createPayment({
        userId: ctx.user.id,
        apartmentId: ctx.user.apartmentId,
        month: input.month,
        voucherNumber: input.voucherNumber,
        voucherImage: input.voucherImage,
        amount: input.amount,
        currency: input.currency,
        status: "pending"
      });
      await createAuditLog({
        userId: ctx.user.id,
        action: "submit_payment",
        entityType: "payment",
        details: `Pago enviado para ${input.month}`
      });
      return { success: true };
    }),
    pending: adminProcedure2.query(async () => {
      return await getPendingPayments();
    }),
    approve: adminProcedure2.input(z2.object({
      id: z2.number(),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const payment = await getPaymentById(input.id);
      if (!payment) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Pago no encontrado" });
      }
      const result = await approvePaymentWithValidations(
        input.id,
        ctx.user.id,
        input.notes
      );
      if (!result.success) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: result.message
        });
      }
      await notifyPaymentApproved(
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
    reject: adminProcedure2.input(z2.object({
      id: z2.number(),
      notes: z2.string()
    })).mutation(async ({ input, ctx }) => {
      const payment = await getPaymentById(input.id);
      if (!payment) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Pago no encontrado" });
      }
      await updatePaymentStatus(input.id, "rejected", ctx.user.id, input.notes);
      await notifyPaymentRejected(
        payment.userId,
        input.id,
        input.notes
      );
      await createAuditLog({
        userId: ctx.user.id,
        action: "reject_payment",
        entityType: "payment",
        entityId: input.id,
        details: input.notes
      });
      return { success: true };
    }),
    byApartment: protectedProcedure.input(z2.object({
      apartmentId: z2.number(),
      month: z2.string().optional()
    })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.apartmentId !== input.apartmentId) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "No tienes permiso para ver pagos de este apartamento"
        });
      }
      return await getPaymentsByApartment(input.apartmentId, input.month);
    }),
    myPayments: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.apartmentId) return [];
      return await getPaymentsByApartment(ctx.user.apartmentId);
    }),
    uploadVoucher: protectedProcedure.input(z2.object({
      paymentId: z2.number(),
      fileData: z2.string(),
      fileName: z2.string(),
      mimeType: z2.string()
    })).mutation(async ({ input, ctx }) => {
      const payment = await getPaymentById(input.paymentId);
      if (!payment) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Pago no encontrado" });
      }
      if (payment.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "No tienes permiso para subir este comprobante" });
      }
      try {
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const result = await uploadPaymentVoucher(
          input.paymentId,
          fileBuffer,
          input.fileName,
          input.mimeType
        );
        await createAuditLog({
          userId: ctx.user.id,
          action: "upload_voucher",
          entityType: "payment",
          entityId: input.paymentId,
          details: `Comprobante subido: ${input.fileName}`
        });
        return { success: true, url: result.url };
      } catch (error) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al subir comprobante"
        });
      }
    }),
    getVoucher: protectedProcedure.input(z2.object({ paymentId: z2.number() })).query(async ({ input, ctx }) => {
      const payment = await getPaymentById(input.paymentId);
      if (!payment) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Pago no encontrado" });
      }
      if (payment.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "No tienes permiso para ver este comprobante" });
      }
      const url = await getPaymentVoucherUrl(input.paymentId);
      return { url };
    }),
    recordManualPayment: adminProcedure2.input(z2.object({
      apartmentId: z2.number(),
      amount: z2.number().positive(),
      month: z2.string(),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const result = await createPayment({
        apartmentId: input.apartmentId,
        userId: ctx.user.id,
        amount: input.amount.toString(),
        month: input.month,
        currency: "USD",
        status: "approved",
        voucherNumber: `MANUAL-${Date.now()}`
      });
      if (!result) {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Error al crear pago" });
      }
      await applyPaymentToDebts(input.apartmentId, input.amount);
      await createAuditLog({
        userId: ctx.user.id,
        action: "record_manual_payment",
        entityType: "payment",
        details: `Pago manual de $${input.amount} registrado para apartamento ${input.apartmentId}. ${input.notes || ""}`
      });
      return { success: true };
    })
  }),
  // ===== GESTIÓN DE DEUDAS =====
  debts: router({
    getByMonth: adminProcedure2.input(z2.object({ month: z2.string() })).query(async ({ input }) => {
      return await getDebtsByMonth(input.month);
    }),
    myDebts: protectedProcedure.query(async ({ ctx }) => {
      return await getAllUserDebts(ctx.user.id);
    }),
    dashboard: adminProcedure2.query(async () => {
      const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const sortBy = "floor";
      const debts = await getAllApartmentsWithDebtStatus(currentMonth, sortBy);
      const {
        totalApartments,
        apartmentsWithoutDebt: paid,
        totalPending,
        totalDue
      } = computeDebtSummary(debts);
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
          totalPending
        }
      };
    })
  }),
  // ===== GESTIÓN DE USUARIOS =====
  users: router({
    list: adminProcedure2.query(async () => {
      return await getAllUsers();
    }),
    byRole: adminProcedure2.input(z2.object({ role: z2.enum(["admin", "user"]) })).query(async ({ input }) => {
      return await getUsersByRole(input.role);
    }),
    assignApartment: adminProcedure2.input(z2.object({
      userId: z2.number(),
      apartmentId: z2.number()
    })).mutation(async ({ input, ctx }) => {
      await updateUser(input.userId, { apartmentId: input.apartmentId });
      await createAuditLog({
        userId: ctx.user.id,
        action: "assign_apartment",
        entityType: "user",
        entityId: input.userId,
        details: `Apartamento ${input.apartmentId} asignado`
      });
      return { success: true };
    }),
    updateRole: adminProcedure2.input(z2.object({
      userId: z2.number(),
      role: z2.enum(["admin", "user"])
    })).mutation(async ({ input, ctx }) => {
      await updateUser(input.userId, { role: input.role });
      await createAuditLog({
        userId: ctx.user.id,
        action: "update_role",
        entityType: "user",
        entityId: input.userId,
        details: `Rol actualizado a ${input.role}`
      });
      return { success: true };
    }),
    pending: adminProcedure2.query(async () => {
      return await getPendingUsers();
    }),
    approve: adminProcedure2.input(z2.object({
      userId: z2.number()
    })).mutation(async ({ input, ctx }) => {
      await updateUser(input.userId, {
        isApproved: true,
        approvalStatus: "approved",
        approvedBy: ctx.user.id,
        approvedAt: /* @__PURE__ */ new Date()
      });
      await createAuditLog({
        userId: ctx.user.id,
        action: "approve_user",
        entityType: "user",
        entityId: input.userId,
        details: "Usuario aprobado"
      });
      return { success: true };
    }),
    reject: adminProcedure2.input(z2.object({
      userId: z2.number(),
      reason: z2.string()
    })).mutation(async ({ input, ctx }) => {
      await updateUser(input.userId, {
        isApproved: false,
        approvalStatus: "rejected",
        rejectionReason: input.reason
      });
      await createAuditLog({
        userId: ctx.user.id,
        action: "reject_user",
        entityType: "user",
        entityId: input.userId,
        details: `Usuario rechazado: ${input.reason}`
      });
      return { success: true };
    }),
    changeRole: adminProcedure2.input(z2.object({
      userId: z2.number(),
      newRole: z2.enum(["admin", "user"])
    })).mutation(async ({ input, ctx }) => {
      await changeUserRole(input.userId, input.newRole);
      await createAuditLog({
        userId: ctx.user.id,
        action: "change_role",
        entityType: "user",
        entityId: input.userId,
        details: `Rol cambiado a ${input.newRole}`
      });
      return { success: true };
    }),
    delete: adminProcedure2.input(z2.object({
      userId: z2.number()
    })).mutation(async ({ input, ctx }) => {
      await deleteUser(input.userId);
      await createAuditLog({
        userId: ctx.user.id,
        action: "delete_user",
        entityType: "user",
        entityId: input.userId,
        details: "Usuario eliminado del sistema"
      });
      return { success: true };
    }),
    toggleActive: adminProcedure2.input(z2.object({
      userId: z2.number(),
      isActive: z2.boolean()
    })).mutation(async ({ input, ctx }) => {
      await toggleUserActive(input.userId, input.isActive);
      await createAuditLog({
        userId: ctx.user.id,
        action: input.isActive ? "activate_user" : "deactivate_user",
        entityType: "user",
        entityId: input.userId,
        details: `Usuario ${input.isActive ? "activado" : "desactivado"}`
      });
      return { success: true };
    })
  }),
  // ===== GESTIÓN DE RECORDATORIOS =====
  reminders: router({
    create: adminProcedure2.input(z2.object({
      userId: z2.number(),
      apartmentId: z2.number(),
      month: z2.string(),
      message: z2.string()
    })).mutation(async ({ input, ctx }) => {
      const result = await createReminder({
        userId: input.userId,
        apartmentId: input.apartmentId,
        month: input.month,
        message: input.message,
        status: "pending"
      });
      await createAuditLog({
        userId: ctx.user.id,
        action: "create_reminder",
        entityType: "reminder",
        details: `Recordatorio creado para ${input.month}`
      });
      return { success: true };
    }),
    pending: adminProcedure2.query(async () => {
      return await getPendingReminders();
    }),
    markSent: adminProcedure2.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
      await updateReminderStatus(input.id, "sent");
      await createAuditLog({
        userId: ctx.user.id,
        action: "send_reminder",
        entityType: "reminder",
        entityId: input.id
      });
      return { success: true };
    })
  }),
  // ===== NOTIFICACIONES =====
  notifications: router({
    list: protectedProcedure.input(z2.object({
      limit: z2.number().min(1).max(100).default(50)
    })).query(async ({ input, ctx }) => {
      return await getUserNotifications(ctx.user.id, input.limit);
    }),
    unread: protectedProcedure.query(async ({ ctx }) => {
      return await getUnreadNotifications(ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await countUnreadNotifications(ctx.user.id);
    }),
    markAsRead: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
      const notification = await getUserNotifications(ctx.user.id, 1e3);
      const exists = notification.some((n) => n.id === input.id);
      if (!exists) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Notificaci\xF3n no encontrada" });
      }
      await markNotificationAsRead(input.id);
      return { success: true };
    }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    })
  }),
  // ===== REPORTES =====
  reports: router({
    monthlyData: protectedProcedure.input(z2.object({
      apartmentId: z2.number().optional(),
      month: z2.string()
    })).query(async ({ input, ctx }) => {
      const apartmentId = input.apartmentId || ctx.user.apartmentId;
      if (!apartmentId) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Apartamento no especificado" });
      }
      if (ctx.user.role !== "admin" && ctx.user.apartmentId !== apartmentId) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "No tienes permiso para ver este reporte" });
      }
      const reportData = await getMonthlyReportData(apartmentId, input.month);
      if (!reportData) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Reporte no encontrado" });
      }
      return reportData;
    }),
    userSummary: protectedProcedure.query(async ({ ctx }) => {
      return await getUserPaymentsSummary(ctx.user.id);
    }),
    debtsSummary: adminProcedure2.input(z2.object({ month: z2.string() })).query(async ({ input }) => {
      return await getMonthlyDebtsSummary(input.month);
    }),
    paymentsByStatus: adminProcedure2.input(z2.object({
      status: z2.enum(["pending", "approved", "rejected"]),
      month: z2.string().optional()
    })).query(async ({ input }) => {
      return await getPaymentsByStatus(input.status, input.month);
    }),
    exportJSON: protectedProcedure.input(z2.object({
      apartmentId: z2.number().optional(),
      month: z2.string()
    })).query(async ({ input, ctx }) => {
      const apartmentId = input.apartmentId || ctx.user.apartmentId;
      if (!apartmentId) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Apartamento no especificado" });
      }
      if (ctx.user.role !== "admin" && ctx.user.apartmentId !== apartmentId) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "No tienes permiso para exportar este reporte" });
      }
      const reportJSON = await generateReportJSON(apartmentId, input.month);
      if (!reportJSON) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Reporte no encontrado" });
      }
      return reportJSON;
    }),
    paymentStatusExport: adminProcedure2.input(z2.object({
      month: z2.string().optional()
    })).query(async ({ input }) => {
      const month = input.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const sortBy = "floor";
      const debts = await getAllApartmentsWithDebtStatus(month, sortBy);
      const {
        totalApartments,
        apartmentsWithoutDebt: paid,
        totalPending,
        totalDue
      } = computeDebtSummary(debts);
      const apartmentsWithDebtCount = totalApartments - paid;
      const config = await getCondominiumConfig();
      return {
        month,
        condominiumName: config?.name || "Condominio",
        debts,
        summary: {
          total: totalApartments,
          paid,
          pending: apartmentsWithDebtCount,
          totalDue,
          totalPending
        }
      };
    }),
    downloadPDF: adminProcedure2.input(z2.object({
      month: z2.string().optional()
    })).query(async ({ input }) => {
      const month = input.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const sortBy = "floor";
      const debts = await getAllApartmentsWithDebtStatus(month, sortBy);
      const {
        totalApartments,
        apartmentsWithoutDebt: paid,
        totalPending,
        totalDue
      } = computeDebtSummary(debts);
      const apartmentsWithDebtCount = totalApartments - paid;
      const config = await getCondominiumConfig();
      const pdfBuffer = await generatePDF({
        month,
        condominiumName: config?.name || "Condominio",
        debts: debts.map((d) => ({
          apartmentId: d.apartmentId,
          apartmentName: d.unitName || d.apartmentNumber,
          totalDue: d.totalDue,
          pendingAmount: d.pendingAmount,
          isPaid: d.isPaid
        })),
        summary: {
          total: totalApartments,
          paid,
          pending: apartmentsWithDebtCount,
          totalDue,
          totalPending
        }
      });
      return { buffer: pdfBuffer.toString("base64"), filename: `Estado-Pagos-${month}.pdf` };
    }),
    downloadExcel: adminProcedure2.input(z2.object({
      month: z2.string().optional()
    })).query(async ({ input }) => {
      const month = input.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const sortBy = "floor";
      const debts = await getAllApartmentsWithDebtStatus(month, sortBy);
      const {
        totalApartments,
        apartmentsWithoutDebt: paid,
        totalPending,
        totalDue
      } = computeDebtSummary(debts);
      const apartmentsWithDebtCount = totalApartments - paid;
      const config = await getCondominiumConfig();
      const excelBuffer = await generateExcel({
        month,
        condominiumName: config?.name || "Condominio",
        debts: debts.map((d) => ({
          apartmentId: d.apartmentId,
          apartmentName: d.unitName || d.apartmentNumber,
          totalDue: d.totalDue,
          pendingAmount: d.pendingAmount,
          isPaid: d.isPaid
        })),
        summary: {
          total: totalApartments,
          paid,
          pending: apartmentsWithDebtCount,
          totalDue,
          totalPending
        }
      });
      return { buffer: excelBuffer.toString("base64"), filename: `Estado-Pagos-${month}.xlsx` };
    })
  }),
  // ===== STORAGE (PRESIGNED URLS) =====
  storage: router({
    generateUploadUrl: protectedProcedure.input(z2.object({
      filePath: z2.string().min(1).max(255),
      expiresIn: z2.number().min(60).max(86400).optional()
    })).mutation(async ({ input }) => {
      return createPresignedUploadUrl(input.filePath, input.expiresIn);
    }),
    generateDownloadUrl: protectedProcedure.input(z2.object({
      filePath: z2.string().min(1).max(255),
      expiresIn: z2.number().min(60).max(86400).optional()
    })).query(async ({ input }) => {
      return createPresignedDownloadUrl(input.filePath, input.expiresIn);
    }),
    delete: adminProcedure2.input(z2.object({
      filePath: z2.string().min(1).max(255)
    })).mutation(async ({ input }) => {
      await deleteFile(input.filePath);
      return { success: true };
    })
  })
});

// server/_core/context.ts
init_supabase();
async function createContext(opts) {
  let user = null;
  try {
    const authHeader = opts.req.headers.authorization;
    let token = extractAuthToken(authHeader);
    if (!token) {
      const rawCookie = opts.req.headers.cookie;
      if (rawCookie) {
        const match = rawCookie.match(/(?:^|;\s*)app_session_id=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : null;
      }
    }
    if (token) {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser?.email) {
        const dbUser = await getUserByEmail(supabaseUser.email);
        if (dbUser) {
          user = dbUser;
        }
        if (!user) {
          const newUser = await createUserFromSupabase({
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email.split("@")[0],
            supabaseUserId: supabaseUser.id,
            role: supabaseUser.user_metadata?.role ?? void 0
          });
          if (newUser) {
            user = newUser;
          }
        }
        if (user && (!user.isActive || user.approvalStatus && user.approvalStatus !== "approved")) {
          user = null;
        }
        if (!user) {
          user = {
            id: 0,
            openId: supabaseUser.id,
            email: supabaseUser.email ?? "",
            name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split("@")[0] ?? supabaseUser.id,
            loginMethod: "supabase",
            role: supabaseUser.user_metadata?.role ?? "user",
            apartmentId: null,
            isApproved: true,
            approvalStatus: "approved",
            approvedBy: null,
            approvedAt: null,
            rejectionReason: null,
            isActive: true,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date(),
            lastSignedIn: /* @__PURE__ */ new Date()
          };
        }
      }
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api/_entry.ts
var app = express();
app.use(helmet());
var limiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." }
});
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var entry_default = app;
export {
  entry_default as default
};
