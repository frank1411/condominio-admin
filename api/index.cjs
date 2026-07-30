"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/_core/supabase.ts
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
var import_supabase_js, supabaseUrl, supabaseAnonKey, supabaseServiceKey, supabaseAnon, supabaseAdmin;
var init_supabase = __esm({
  "server/_core/supabase.ts"() {
    "use strict";
    import_supabase_js = require("@supabase/supabase-js");
    supabaseUrl = process.env.SUPABASE_URL ?? "";
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    supabaseAnon = supabaseUrl && supabaseAnonKey ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }) : null;
    supabaseAdmin = supabaseUrl && supabaseServiceKey ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }) : null;
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storageGet: () => storageGet,
  storagePut: () => storagePut
});
function getBucket() {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase client not initialized. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }
  return BUCKET;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const bucket = getBucket();
  const key = normalizeKey(relKey);
  const fileData = typeof data === "string" ? new Blob([data], { type: contentType }) : data;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(key, fileData, {
    contentType,
    upsert: true
  });
  if (error) {
    throw new Error(
      `Storage upload failed: ${error.message} (bucket: ${bucket}, key: ${key})`
    );
  }
  const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
  return { key, url: publicData.publicUrl };
}
async function storageGet(relKey) {
  const bucket = getBucket();
  const key = normalizeKey(relKey);
  const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
  return { key, url: publicData.publicUrl };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
var BUCKET;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_supabase();
    BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "condominio-admin";
  }
});

// api/_entry.ts
var entry_exports = {};
__export(entry_exports, {
  default: () => entry_default
});
module.exports = __toCommonJS(entry_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_express2 = require("@trpc/server/adapters/express");

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
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
var import_zod = require("zod");

// server/_core/trpc.ts
var import_server = require("@trpc/server");
var import_superjson = __toESM(require("superjson"), 1);
var t = import_server.initTRPC.context().create({
  transformer: import_superjson.default
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new import_server.TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
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
      throw new import_server.TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
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
    import_zod.z.object({
      timestamp: import_zod.z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  }))
});

// server/routers.ts
var import_zod2 = require("zod");
var import_server2 = require("@trpc/server");

// server/db.ts
var import_drizzle_orm = require("drizzle-orm");
var import_postgres_js = require("drizzle-orm/postgres-js");

// drizzle/schema.ts
var import_pg_core = require("drizzle-orm/pg-core");
var roleEnum = (0, import_pg_core.pgEnum)("role", ["user", "admin"]);
var approvalStatusEnum = (0, import_pg_core.pgEnum)("approval_status", ["pending", "approved", "rejected"]);
var currencyEnum = (0, import_pg_core.pgEnum)("currency", ["USD", "VES"]);
var paymentStatusEnum = (0, import_pg_core.pgEnum)("payment_status", ["pending", "approved", "rejected"]);
var reminderStatusEnum = (0, import_pg_core.pgEnum)("reminder_status", ["pending", "sent", "failed"]);
var notificationTypeEnum = (0, import_pg_core.pgEnum)("notification_type", [
  "payment_approved",
  "payment_rejected",
  "payment_received",
  "debt_created",
  "debt_paid",
  "reminder",
  "system"
]);
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  openId: (0, import_pg_core.varchar)("openId", { length: 64 }).notNull().unique(),
  name: (0, import_pg_core.text)("name"),
  email: (0, import_pg_core.varchar)("email", { length: 320 }),
  loginMethod: (0, import_pg_core.varchar)("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  apartmentId: (0, import_pg_core.integer)("apartmentId"),
  // FK a apartments
  isApproved: (0, import_pg_core.boolean)("isApproved").default(false),
  // DEPRECATED, usar approvalStatus
  approvalStatus: approvalStatusEnum("approvalStatus").default("pending"),
  // Estado de aprobación
  approvedBy: (0, import_pg_core.integer)("approvedBy"),
  // FK a users (admin que aprobó)
  approvedAt: (0, import_pg_core.timestamp)("approvedAt"),
  rejectionReason: (0, import_pg_core.text)("rejectionReason"),
  // Razón si fue rechazado
  isActive: (0, import_pg_core.boolean)("isActive").default(true),
  // Usuario activo/inactivo
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull(),
  lastSignedIn: (0, import_pg_core.timestamp)("lastSignedIn").defaultNow().notNull()
});
var condominiumConfig = (0, import_pg_core.pgTable)("condominiumConfig", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.varchar)("name", { length: 255 }).default("Mi Condominio"),
  floors: (0, import_pg_core.integer)("floors").default(5),
  // PB + 4 pisos = 5 niveles
  apartmentsPerFloor: (0, import_pg_core.integer)("apartmentsPerFloor").default(6),
  baseFee: (0, import_pg_core.decimal)("baseFee", { precision: 10, scale: 2 }).default("0.00"),
  // Mensualidad base en USD
  defaultCurrency: currencyEnum("defaultCurrency").default("USD"),
  exchangeRate: (0, import_pg_core.decimal)("exchangeRate", { precision: 10, scale: 4 }).default("1.0000"),
  // VES a USD
  reminderDay: (0, import_pg_core.integer)("reminderDay").default(5),
  // Día del mes para enviar recordatorios (1-28)
  apartmentNamePattern: (0, import_pg_core.varchar)("apartmentNamePattern", { length: 255 }).default("Apt-{piso}-{numero}"),
  // Patrón para nombres
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
});
var floors = (0, import_pg_core.pgTable)("floors", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  floorNumber: (0, import_pg_core.integer)("floorNumber").notNull(),
  // 0 = PB, 1-4 = pisos
  floorName: (0, import_pg_core.varchar)("floorName", { length: 100 }).notNull(),
  // "Planta Baja", "Piso 1", etc.
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
});
var apartments = (0, import_pg_core.pgTable)("apartments", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  floorId: (0, import_pg_core.integer)("floorId").notNull(),
  // FK a floors
  apartmentNumber: (0, import_pg_core.varchar)("apartmentNumber", { length: 50 }).notNull(),
  // "101", "201", etc.
  unitName: (0, import_pg_core.varchar)("unitName", { length: 100 }),
  // Nombre descriptivo
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
});
var charges = (0, import_pg_core.pgTable)("charges", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
  // "Agua", "Electricidad", etc.
  description: (0, import_pg_core.text)("description"),
  amount: (0, import_pg_core.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  isRecurring: (0, import_pg_core.boolean)("isRecurring").default(true),
  // ¿Es mensual?
  isActive: (0, import_pg_core.boolean)("isActive").default(true),
  apartmentId: (0, import_pg_core.integer)("apartmentId"),
  // FK a apartments (null = aplica a todos)
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
});
var payments = (0, import_pg_core.pgTable)("payments", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("userId").notNull(),
  // FK a users
  apartmentId: (0, import_pg_core.integer)("apartmentId").notNull(),
  // FK a apartments
  month: (0, import_pg_core.varchar)("month", { length: 7 }).notNull(),
  // "2026-03" formato YYYY-MM
  voucherNumber: (0, import_pg_core.varchar)("voucherNumber", { length: 100 }),
  voucherImage: (0, import_pg_core.text)("voucherImage"),
  // DEPRECATED: Base64 antiguo, migrar a S3
  voucherImageUrl: (0, import_pg_core.varchar)("voucherImageUrl", { length: 500 }),
  // URL de S3
  voucherImageKey: (0, import_pg_core.varchar)("voucherImageKey", { length: 255 }),
  // Clave en S3 para eliminar
  amount: (0, import_pg_core.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  status: paymentStatusEnum("status").default("pending"),
  notes: (0, import_pg_core.text)("notes"),
  submittedAt: (0, import_pg_core.timestamp)("submittedAt").defaultNow().notNull(),
  reviewedAt: (0, import_pg_core.timestamp)("reviewedAt"),
  reviewedBy: (0, import_pg_core.integer)("reviewedBy"),
  // FK a users (admin que revisó)
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
});
var monthlyDebts = (0, import_pg_core.pgTable)("monthlyDebts", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  apartmentId: (0, import_pg_core.integer)("apartmentId").notNull(),
  // FK a apartments
  chargeId: (0, import_pg_core.integer)("chargeId"),
  // FK a charges (para rastrear qué cobro generó esta deuda)
  month: (0, import_pg_core.varchar)("month", { length: 7 }).notNull(),
  // "2026-03"
  totalDue: (0, import_pg_core.decimal)("totalDue", { precision: 10, scale: 2 }).notNull(),
  totalPaid: (0, import_pg_core.decimal)("totalPaid", { precision: 10, scale: 2 }).default("0.00"),
  pendingAmount: (0, import_pg_core.decimal)("pendingAmount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("USD"),
  isPaid: (0, import_pg_core.boolean)("isPaid").default(false),
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
});
var reminders = (0, import_pg_core.pgTable)("reminders", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("userId").notNull(),
  // FK a users
  apartmentId: (0, import_pg_core.integer)("apartmentId").notNull(),
  // FK a apartments
  month: (0, import_pg_core.varchar)("month", { length: 7 }).notNull(),
  // "2026-03"
  message: (0, import_pg_core.text)("message"),
  sentAt: (0, import_pg_core.timestamp)("sentAt"),
  status: reminderStatusEnum("status").default("pending"),
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
});
var auditLog = (0, import_pg_core.pgTable)("auditLog", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("userId"),
  // FK a users (quién hizo la acción)
  action: (0, import_pg_core.varchar)("action", { length: 255 }).notNull(),
  // "approve_payment", "create_charge", etc.
  entityType: (0, import_pg_core.varchar)("entityType", { length: 100 }),
  // "payment", "charge", "user", etc.
  entityId: (0, import_pg_core.integer)("entityId"),
  details: (0, import_pg_core.text)("details"),
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
});
var notifications = (0, import_pg_core.pgTable)("notifications", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("userId").notNull(),
  // FK a users (destinatario)
  type: notificationTypeEnum("type").notNull(),
  title: (0, import_pg_core.varchar)("title", { length: 255 }).notNull(),
  message: (0, import_pg_core.text)("message").notNull(),
  relatedEntityType: (0, import_pg_core.varchar)("relatedEntityType", { length: 100 }),
  // "payment", "debt", etc.
  relatedEntityId: (0, import_pg_core.integer)("relatedEntityId"),
  isRead: (0, import_pg_core.boolean)("isRead").default(false),
  actionUrl: (0, import_pg_core.varchar)("actionUrl", { length: 512 }),
  // URL para la acción
  createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
  readAt: (0, import_pg_core.timestamp)("readAt")
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = (0, import_postgres_js.drizzle)(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createUserFromSupabase(data) {
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
      isActive: true
    }).returning();
    return result[0] ?? null;
  } catch (error) {
    console.warn("[Database] Failed to create user from Supabase:", error);
    return null;
  }
}
async function getCondominiumConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(condominiumConfig).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function updateCondominiumConfig(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.update(condominiumConfig).set(data).where((0, import_drizzle_orm.eq)(condominiumConfig.id, 1));
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
    const floorResult = await db.insert(floors).values({
      floorNumber: i,
      floorName: floorNames[i] || `Piso ${i}`
    });
    const floorId = floorResult.insertId;
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
  return await db.select().from(apartments).where((0, import_drizzle_orm.eq)(apartments.floorId, floorId));
}
async function getAllCharges() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(charges).where((0, import_drizzle_orm.eq)(charges.isActive, true));
}
async function createCharge(data) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(charges).values(data);
  const created = await db.select().from(charges).where((0, import_drizzle_orm.eq)(charges.name, data.name || "")).orderBy((0, import_drizzle_orm.desc)(charges.createdAt)).limit(1);
  return created && created.length > 0 ? created[0] : null;
}
async function updateCharge(id, data) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(charges).set(data).where((0, import_drizzle_orm.eq)(charges.id, id));
}
async function deleteCharge(id) {
  const db = await getDb();
  if (!db) return null;
  await db.delete(monthlyDebts).where((0, import_drizzle_orm.eq)(monthlyDebts.chargeId, id));
  return await db.update(charges).set({ isActive: false }).where((0, import_drizzle_orm.eq)(charges.id, id));
}
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
  const { eq: drizzleEq, desc: desc2 } = await import("drizzle-orm");
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
    }).from(payments).innerJoin(apartments, drizzleEq(payments.apartmentId, apartments.id)).where(drizzleEq(payments.status, "pending")).orderBy(desc2(payments.createdAt)).limit(limit).offset(offset);
    return { data, total: data.length };
  } catch (error) {
    console.error("[Payments] Error fetching pending payments:", error);
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
  return await db.update(payments).set(data).where((0, import_drizzle_orm.eq)(payments.id, id));
}
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
    updatedAt: monthlyDebts.updatedAt
  }).from(monthlyDebts).innerJoin(apartments, drizzleEq(monthlyDebts.apartmentId, apartments.id)).where(drizzleEq(monthlyDebts.apartmentId, user.apartmentId));
  return result;
}
async function createReminder(data) {
  const db = await getDb();
  if (!db) return null;
  return await db.insert(reminders).values(data);
}
async function getPendingReminders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reminders).where((0, import_drizzle_orm.eq)(reminders.status, "pending"));
}
async function updateReminderStatus(id, status) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(reminders).set({ status, sentAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(reminders.id, id));
}
async function createAuditLog(data) {
  const db = await getDb();
  if (!db) return null;
  return await db.insert(auditLog).values(data);
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}
async function getUsersByRole(role) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where((0, import_drizzle_orm.eq)(users.role, role));
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
  return await db.update(users).set(data).where((0, import_drizzle_orm.eq)(users.id, id));
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
async function generateAllApartmentNames() {
  const db = await getDb();
  if (!db) return null;
  try {
    const config = await getCondominiumConfig();
    if (!config) return null;
    const pattern = config.apartmentNamePattern || "Apt-{piso}-{numero}";
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
        await db.update(apartments).set({ unitName: newName }).where((0, import_drizzle_orm.eq)(apartments.id, apartment.id));
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error generating apartment names:", error);
    return null;
  }
}
async function updateApartmentName(id, name) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(apartments).set({ unitName: name }).where((0, import_drizzle_orm.eq)(apartments.id, id));
}
async function changeUserRole(userId, newRole) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(users).set({ role: newRole }).where((0, import_drizzle_orm.eq)(users.id, userId));
}
async function deleteUser(userId) {
  const db = await getDb();
  if (!db) return null;
  return await db.delete(users).where((0, import_drizzle_orm.eq)(users.id, userId));
}
async function toggleUserActive(userId, isActive) {
  const db = await getDb();
  if (!db) return null;
  return await db.update(users).set({ isActive }).where((0, import_drizzle_orm.eq)(users.id, userId));
}
async function generateDebtsFromCharge(chargeId) {
  const db = await getDb();
  if (!db) return;
  try {
    const charge = await db.select().from(charges).where((0, import_drizzle_orm.eq)(charges.id, chargeId)).limit(1);
    if (!charge || charge.length === 0) {
      console.error(`[Debt Generation] Charge ${chargeId} not found`);
      return;
    }
    const chargeData = charge[0];
    const currentMonth = /* @__PURE__ */ new Date();
    const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    const chargeAmount = parseFloat(chargeData.amount);
    if (chargeData.apartmentId) {
      const existingDebt = await db.select().from(monthlyDebts).where(
        (0, import_drizzle_orm.and)(
          (0, import_drizzle_orm.eq)(monthlyDebts.apartmentId, chargeData.apartmentId),
          (0, import_drizzle_orm.eq)(monthlyDebts.month, month)
        )
      ).limit(1);
      if (existingDebt && existingDebt.length > 0) {
        const debt = existingDebt[0];
        const totalDue = parseFloat(debt.totalDue) + chargeAmount;
        const pendingAmount = parseFloat(debt.pendingAmount) + chargeAmount;
        await db.update(monthlyDebts).set({
          totalDue: totalDue.toString(),
          pendingAmount: pendingAmount.toString()
        }).where((0, import_drizzle_orm.eq)(monthlyDebts.id, debt.id));
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
    } else {
      const allApartments = await db.select().from(apartments);
      for (const apt of allApartments) {
        const existingDebt = await db.select().from(monthlyDebts).where(
          (0, import_drizzle_orm.and)(
            (0, import_drizzle_orm.eq)(monthlyDebts.apartmentId, apt.id),
            (0, import_drizzle_orm.eq)(monthlyDebts.month, month)
          )
        ).limit(1);
        if (existingDebt && existingDebt.length > 0) {
          const debt = existingDebt[0];
          const totalDue = parseFloat(debt.totalDue) + chargeAmount;
          const pendingAmount = parseFloat(debt.pendingAmount) + chargeAmount;
          await db.update(monthlyDebts).set({
            totalDue: totalDue.toString(),
            pendingAmount: pendingAmount.toString()
          }).where((0, import_drizzle_orm.eq)(monthlyDebts.id, debt.id));
        } else {
          await db.insert(monthlyDebts).values({
            apartmentId: apt.id,
            chargeId,
            month,
            totalDue: chargeAmount.toString(),
            pendingAmount: chargeAmount.toString(),
            isPaid: false
          });
        }
      }
    }
    console.log(`[Debt Generation] Successfully generated debts for charge ${chargeId}`);
  } catch (error) {
    console.error(`[Debt Generation] Error generating debts for charge ${chargeId}:`, error);
  }
}
async function getPaymentById(id) {
  const db = await getDb();
  if (!db) return null;
  const { eq: drizzleEq } = await import("drizzle-orm");
  const result = await db.select().from(payments).where(drizzleEq(payments.id, id));
  return result.length > 0 ? result[0] : null;
}
async function applyPaymentToDebts(apartmentId, paymentAmount) {
  const db = await getDb();
  if (!db) return null;
  const { eq: drizzleEq, and: and2 } = await import("drizzle-orm");
  try {
    const pendingDebts = await db.select().from(monthlyDebts).where(and2(
      drizzleEq(monthlyDebts.apartmentId, apartmentId),
      drizzleEq(monthlyDebts.isPaid, false)
    )).orderBy(monthlyDebts.month);
    let remainingPayment = paymentAmount;
    let appliedTotal = 0;
    for (const debt of pendingDebts) {
      if (remainingPayment <= 0) break;
      const debtAmount = parseFloat(debt.pendingAmount);
      const currentPaid = parseFloat(debt.totalPaid) || 0;
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
    return { success: true, appliedAmount: appliedTotal };
  } catch (error) {
    console.error("[Payment Liquidation] Error applying payment to debts:", error);
    return { success: false, appliedAmount: 0 };
  }
}
async function validatePaymentAmount(apartmentId, paymentAmount) {
  const db = await getDb();
  if (!db) return { valid: false, reason: "Base de datos no disponible" };
  const { eq: drizzleEq, and: and2 } = await import("drizzle-orm");
  try {
    const pendingDebts = await db.select().from(monthlyDebts).where(and2(
      drizzleEq(monthlyDebts.apartmentId, apartmentId),
      drizzleEq(monthlyDebts.isPaid, false)
    ));
    const totalPending = pendingDebts.reduce((sum, debt) => {
      const pending = parseFloat(debt.pendingAmount) || 0;
      return sum + pending;
    }, 0);
    if (paymentAmount > totalPending + 0.01) {
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
  const { eq: drizzleEq } = await import("drizzle-orm");
  try {
    const payment = await db.select().from(payments).where(drizzleEq(payments.id, paymentId));
    if (payment.length === 0) {
      return { success: false, message: "Pago no encontrado" };
    }
    const paymentData = payment[0];
    const paymentAmount = parseFloat(paymentData.amount);
    const monthValidation = validatePaymentMonth(paymentData.month);
    if (!monthValidation.valid) {
      return { success: false, message: monthValidation.reason || "Fecha inv\xE1lida" };
    }
    const amountValidation = await validatePaymentAmount(paymentData.apartmentId, paymentAmount);
    if (!amountValidation.valid) {
      return { success: false, message: amountValidation.reason || "Monto inv\xE1lido" };
    }
    await db.update(payments).set({
      status: "approved",
      reviewedAt: /* @__PURE__ */ new Date(),
      reviewedBy,
      notes: notes || null
    }).where(drizzleEq(payments.id, paymentId));
    const liquidationResult = await applyPaymentToDebts(paymentData.apartmentId, paymentAmount);
    if (!liquidationResult || !liquidationResult.success) {
      await db.update(payments).set({
        status: "pending",
        reviewedAt: null,
        reviewedBy: null,
        notes: null
      }).where(drizzleEq(payments.id, paymentId));
      return { success: false, message: "Error al liquidar las deudas" };
    }
    await db.insert(auditLog).values({
      userId: reviewedBy,
      action: "approve_payment",
      entityType: "payment",
      entityId: paymentId,
      details: `Pago aprobado: $${paymentAmount.toFixed(2)} - ${notes || "Sin notas"}`
    });
    return {
      success: true,
      message: "Pago aprobado exitosamente",
      appliedAmount: liquidationResult?.appliedAmount
    };
  } catch (error) {
    console.error("[Payment Approval] Error approving payment:", error);
    return { success: false, message: "Error al aprobar el pago" };
  }
}
async function createNotification(data) {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.insert(notifications).values(data);
  } catch (error) {
    console.error("[Notifications] Error creating notification:", error);
    return null;
  }
}
async function getUnreadNotifications(userId) {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq } = await import("drizzle-orm");
  try {
    return await db.select().from(notifications).where(
      (0, import_drizzle_orm.and)(
        drizzleEq(notifications.userId, userId),
        drizzleEq(notifications.isRead, false)
      )
    ).orderBy((0, import_drizzle_orm.desc)(notifications.createdAt));
  } catch (error) {
    console.error("[Notifications] Error getting unread notifications:", error);
    return [];
  }
}
async function getUserNotifications(userId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq } = await import("drizzle-orm");
  try {
    return await db.select().from(notifications).where(drizzleEq(notifications.userId, userId)).orderBy((0, import_drizzle_orm.desc)(notifications.createdAt)).limit(limit);
  } catch (error) {
    console.error("[Notifications] Error getting user notifications:", error);
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
    console.error("[Notifications] Error marking notification as read:", error);
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
      (0, import_drizzle_orm.and)(
        drizzleEq(notifications.userId, userId),
        drizzleEq(notifications.isRead, false)
      )
    );
  } catch (error) {
    console.error("[Notifications] Error marking all notifications as read:", error);
    return null;
  }
}
async function countUnreadNotifications(userId) {
  const db = await getDb();
  if (!db) return 0;
  const { eq: drizzleEq, sql } = await import("drizzle-orm");
  try {
    const result = await db.select({ count: sql`COUNT(*)` }).from(notifications).where(
      (0, import_drizzle_orm.and)(
        drizzleEq(notifications.userId, userId),
        drizzleEq(notifications.isRead, false)
      )
    );
    return parseInt(result[0]?.count) || 0;
  } catch (error) {
    console.error("[Notifications] Error counting unread notifications:", error);
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
async function uploadPaymentVoucher(paymentId, fileBuffer, fileName, mimeType) {
  const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
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
    const { url, key } = await storagePut2(s3Key, fileBuffer, mimeType);
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const { eq: eq2 } = await import("drizzle-orm");
    await db.update(payments).set({
      voucherImageUrl: url,
      voucherImageKey: key,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(payments.id, paymentId));
    return { url, key };
  } catch (error) {
    console.error("[S3] Error uploading voucher:", error);
    throw error;
  }
}
async function getPaymentVoucherUrl(paymentId) {
  const db = await getDb();
  if (!db) return null;
  const { eq: eq2 } = await import("drizzle-orm");
  try {
    const payment = await db.select({ voucherImageUrl: payments.voucherImageUrl }).from(payments).where(eq2(payments.id, paymentId)).limit(1);
    return payment[0]?.voucherImageUrl || null;
  } catch (error) {
    console.error("[S3] Error getting voucher URL:", error);
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
async function getMonthlyReportData(apartmentId, month) {
  const db = await getDb();
  if (!db) return null;
  const { eq: eq2, and: and2, asc: asc2, desc: desc2 } = await import("drizzle-orm");
  try {
    const apartment = await db.select().from(apartments).where(eq2(apartments.id, apartmentId)).limit(1);
    if (!apartment[0]) return null;
    const monthPayments = await db.select().from(payments).where(
      and2(
        eq2(payments.apartmentId, apartmentId),
        eq2(payments.month, month)
      )
    );
    const monthDebts = await db.select().from(monthlyDebts).where(
      and2(
        eq2(monthlyDebts.apartmentId, apartmentId),
        eq2(monthlyDebts.month, month)
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
    console.error("[Reports] Error getting monthly report data:", error);
    return null;
  }
}
async function getUserPaymentsSummary(userId, limit = 12) {
  const db = await getDb();
  if (!db) return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
  const { eq: eq2, and: and2, asc: asc2, desc: desc2 } = await import("drizzle-orm");
  try {
    const user = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
    if (!user[0] || !user[0].apartmentId) {
      return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
    }
    const userPayments = await db.select().from(payments).where(eq2(payments.apartmentId, user[0].apartmentId)).orderBy(desc2(payments.submittedAt)).limit(limit);
    const userDebts = await db.select().from(monthlyDebts).where(
      and2(
        eq2(monthlyDebts.apartmentId, user[0].apartmentId),
        eq2(monthlyDebts.isPaid, false)
      )
    ).orderBy(asc2(monthlyDebts.month));
    const totalPaid = userPayments.filter((p) => p.status === "approved").reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    const totalPending = userDebts.reduce((sum, d) => sum + parseFloat(d.pendingAmount || "0"), 0);
    return {
      payments: userPayments,
      debts: userDebts,
      totalPaid: totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2)
    };
  } catch (error) {
    console.error("[Reports] Error getting user payments summary:", error);
    return { payments: [], debts: [], totalPaid: "0", totalPending: "0" };
  }
}
async function getMonthlyDebtsSummary(month) {
  const db = await getDb();
  if (!db) return [];
  const { eq: eq2 } = await import("drizzle-orm");
  try {
    return await db.select().from(monthlyDebts).where(eq2(monthlyDebts.month, month)).orderBy((0, import_drizzle_orm.desc)(monthlyDebts.pendingAmount));
  } catch (error) {
    console.error("[Reports] Error getting monthly debts summary:", error);
    return [];
  }
}
async function getPaymentsByStatus(status, month) {
  const db = await getDb();
  if (!db) return [];
  const { eq: eq2, and: and2 } = await import("drizzle-orm");
  try {
    let query = db.select().from(payments).where(eq2(payments.status, status));
    if (month) {
      query = db.select().from(payments).where(
        and2(
          eq2(payments.status, status),
          eq2(payments.month, month)
        )
      );
    }
    return await query.orderBy((0, import_drizzle_orm.desc)(payments.submittedAt));
  } catch (error) {
    console.error("[Reports] Error getting payments by status:", error);
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
async function getAllApartmentsWithDebtStatus(month, sortBy = "floor") {
  const db = await getDb();
  if (!db) return [];
  const { eq: drizzleEq, asc: asc2 } = await import("drizzle-orm");
  const allApts = await db.select().from(apartments).orderBy(asc2(apartments.id));
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
      apartmentNumber: apt.apartmentNumber
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

// server/exports.ts
var import_pdfkit = __toESM(require("pdfkit"), 1);
var import_exceljs = __toESM(require("exceljs"), 1);
async function generatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new import_pdfkit.default({ margin: 40 });
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
      data.debts.forEach((debt, index) => {
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
  const workbook = new import_exceljs.default.Workbook();
  const worksheet = workbook.addWorksheet("Estado de Pagos");
  worksheet.mergeCells("A1:D1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = data.condominiumName;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "center" };
  worksheet.mergeCells("A2:D2");
  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = "Estado de Pagos por Apartamento";
  subtitleCell.font = { size: 12, bold: true };
  subtitleCell.alignment = { horizontal: "center", vertical: "center" };
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
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new import_server2.TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden acceder" });
  }
  return next({ ctx });
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ===== CONFIGURACIÓN DEL CONDOMINIO =====
  config: router({
    get: publicProcedure.query(async () => {
      const config = await getCondominiumConfig();
      if (!config) {
        return await initializeCondominiumConfig();
      }
      return config;
    }),
    update: adminProcedure2.input(import_zod2.z.object({
      name: import_zod2.z.string().optional(),
      floors: import_zod2.z.number().min(1).max(20).optional(),
      apartmentsPerFloor: import_zod2.z.number().min(1).max(50).optional(),
      baseFee: import_zod2.z.string().optional(),
      defaultCurrency: import_zod2.z.enum(["USD", "VES"]).optional(),
      exchangeRate: import_zod2.z.string().optional(),
      reminderDay: import_zod2.z.number().min(1).max(28).optional(),
      apartmentNamePattern: import_zod2.z.string().optional()
    })).mutation(async ({ input }) => {
      const result = await updateCondominiumConfig(input);
      return await getCondominiumConfig();
    }),
    initializeStructure: adminProcedure2.mutation(async () => {
      await initializeFloorsAndApartments();
      return { success: true };
    }),
    generateApartmentNames: adminProcedure2.mutation(async () => {
      const result = await generateAllApartmentNames();
      return result || { success: false };
    }),
    getPatternExamples: adminProcedure2.input(import_zod2.z.object({ pattern: import_zod2.z.string() })).query(async ({ input }) => {
      const config = await getCondominiumConfig();
      if (!config) return [];
      return generatePatternExamples(input.pattern, config.floors || 5, config.apartmentsPerFloor || 6);
    })
  }),
  // ===== GESTIÓN DE PISOS Y APARTAMENTOS =====
  floors: router({
    list: publicProcedure.query(async () => {
      return await getAllFloors();
    }),
    withApartments: publicProcedure.query(async () => {
      const floors2 = await getAllFloors();
      const apartments2 = await getAllApartments();
      return floors2.map((floor) => ({
        ...floor,
        apartments: apartments2.filter((apt) => apt.floorId === floor.id)
      }));
    })
  }),
  apartments: router({
    list: publicProcedure.query(async () => {
      return await getAllApartments();
    }),
    byFloor: publicProcedure.input(import_zod2.z.object({ floorId: import_zod2.z.number() })).query(async ({ input }) => {
      return await getApartmentsByFloor(input.floorId);
    }),
    updateName: adminProcedure2.input(import_zod2.z.object({
      apartmentId: import_zod2.z.number(),
      name: import_zod2.z.string()
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
    list: publicProcedure.query(async () => {
      return await getAllCharges();
    }),
    create: adminProcedure2.input(import_zod2.z.object({
      name: import_zod2.z.string().min(1),
      description: import_zod2.z.string().optional(),
      amount: import_zod2.z.string(),
      currency: import_zod2.z.enum(["USD", "VES"]).default("USD"),
      isRecurring: import_zod2.z.boolean().default(true),
      apartmentId: import_zod2.z.number().optional()
    })).mutation(async ({ input, ctx }) => {
      const config = await getCondominiumConfig();
      const exchangeRate = config ? parseFloat(config.exchangeRate || "1") : 1;
      let amountInUSD = parseFloat(input.amount);
      if (input.currency === "VES" && exchangeRate > 0) {
        amountInUSD = amountInUSD / exchangeRate;
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
    update: adminProcedure2.input(import_zod2.z.object({
      id: import_zod2.z.number(),
      name: import_zod2.z.string().optional(),
      description: import_zod2.z.string().optional(),
      amount: import_zod2.z.string().optional(),
      currency: import_zod2.z.enum(["USD", "VES"]).optional(),
      isRecurring: import_zod2.z.boolean().optional(),
      apartmentId: import_zod2.z.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCharge(id, data);
      return { success: true };
    }),
    delete: adminProcedure2.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(async ({ input }) => {
      await deleteCharge(input.id);
      return { success: true };
    })
  }),
  // ===== GESTIÓN DE PAGOS =====
  payments: router({
    submit: protectedProcedure.input(import_zod2.z.object({
      month: import_zod2.z.string(),
      // "2026-03"
      voucherNumber: import_zod2.z.string().optional(),
      voucherImage: import_zod2.z.string().optional(),
      // Base64
      amount: import_zod2.z.string(),
      currency: import_zod2.z.enum(["USD", "VES"])
    })).mutation(async ({ input, ctx }) => {
      if (!ctx.user.apartmentId) {
        throw new import_server2.TRPCError({ code: "BAD_REQUEST", message: "Usuario no tiene apartamento asignado" });
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
    approve: adminProcedure2.input(import_zod2.z.object({
      id: import_zod2.z.number(),
      notes: import_zod2.z.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const payment = await getPaymentById(input.id);
      if (!payment) {
        throw new import_server2.TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
      }
      const result = await approvePaymentWithValidations(
        input.id,
        ctx.user.id,
        input.notes
      );
      if (!result.success) {
        throw new import_server2.TRPCError({
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
    reject: adminProcedure2.input(import_zod2.z.object({
      id: import_zod2.z.number(),
      notes: import_zod2.z.string()
    })).mutation(async ({ input, ctx }) => {
      const payment = await getPaymentById(input.id);
      if (!payment) {
        throw new import_server2.TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
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
    byApartment: protectedProcedure.input(import_zod2.z.object({
      apartmentId: import_zod2.z.number(),
      month: import_zod2.z.string().optional()
    })).query(async ({ input }) => {
      return await getPaymentsByApartment(input.apartmentId, input.month);
    }),
    myPayments: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.apartmentId) return [];
      return await getPaymentsByApartment(ctx.user.apartmentId);
    }),
    uploadVoucher: protectedProcedure.input(import_zod2.z.object({
      paymentId: import_zod2.z.number(),
      fileData: import_zod2.z.string(),
      fileName: import_zod2.z.string(),
      mimeType: import_zod2.z.string()
    })).mutation(async ({ input, ctx }) => {
      const payment = await getPaymentById(input.paymentId);
      if (!payment) {
        throw new import_server2.TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
      }
      if (payment.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new import_server2.TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para subir este comprobante" });
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
        throw new import_server2.TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al subir comprobante"
        });
      }
    }),
    getVoucher: protectedProcedure.input(import_zod2.z.object({ paymentId: import_zod2.z.number() })).query(async ({ input, ctx }) => {
      const payment = await getPaymentById(input.paymentId);
      if (!payment) {
        throw new import_server2.TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
      }
      if (payment.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new import_server2.TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver este comprobante" });
      }
      const url = await getPaymentVoucherUrl(input.paymentId);
      return { url };
    }),
    recordManualPayment: adminProcedure2.input(import_zod2.z.object({
      apartmentId: import_zod2.z.number(),
      amount: import_zod2.z.number().positive(),
      month: import_zod2.z.string(),
      notes: import_zod2.z.string().optional()
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
        throw new import_server2.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al crear pago" });
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
    getByMonth: adminProcedure2.input(import_zod2.z.object({ month: import_zod2.z.string() })).query(async ({ input }) => {
      return await getDebtsByMonth(input.month);
    }),
    myDebts: protectedProcedure.query(async ({ ctx }) => {
      return await getAllUserDebts(ctx.user.id);
    }),
    dashboard: adminProcedure2.query(async () => {
      const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const sortBy = "floor";
      const debts = await getAllApartmentsWithDebtStatus(currentMonth, sortBy);
      const totalApartments = debts.length;
      const apartmentsWithDebt = debts.filter((d) => !d.isPaid);
      const apartmentsWithoutDebt = totalApartments - apartmentsWithDebt.length;
      const totalPending = apartmentsWithDebt.reduce((sum, d) => sum + parseFloat(d.pendingAmount), 0);
      const totalDue = debts.reduce((sum, d) => sum + parseFloat(d.totalDue), 0);
      return {
        currentMonth,
        debts,
        sortBy,
        summary: {
          total: totalApartments,
          paid: apartmentsWithoutDebt,
          pending: apartmentsWithDebt.length,
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
    byRole: adminProcedure2.input(import_zod2.z.object({ role: import_zod2.z.enum(["admin", "user"]) })).query(async ({ input }) => {
      return await getUsersByRole(input.role);
    }),
    assignApartment: adminProcedure2.input(import_zod2.z.object({
      userId: import_zod2.z.number(),
      apartmentId: import_zod2.z.number()
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
    updateRole: adminProcedure2.input(import_zod2.z.object({
      userId: import_zod2.z.number(),
      role: import_zod2.z.enum(["admin", "user"])
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
    approve: adminProcedure2.input(import_zod2.z.object({
      userId: import_zod2.z.number()
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
    reject: adminProcedure2.input(import_zod2.z.object({
      userId: import_zod2.z.number(),
      reason: import_zod2.z.string()
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
    changeRole: adminProcedure2.input(import_zod2.z.object({
      userId: import_zod2.z.number(),
      newRole: import_zod2.z.enum(["admin", "user"])
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
    delete: adminProcedure2.input(import_zod2.z.object({
      userId: import_zod2.z.number()
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
    toggleActive: adminProcedure2.input(import_zod2.z.object({
      userId: import_zod2.z.number(),
      isActive: import_zod2.z.boolean()
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
    create: adminProcedure2.input(import_zod2.z.object({
      userId: import_zod2.z.number(),
      apartmentId: import_zod2.z.number(),
      month: import_zod2.z.string(),
      message: import_zod2.z.string()
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
    markSent: adminProcedure2.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(async ({ input, ctx }) => {
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
    list: protectedProcedure.input(import_zod2.z.object({
      limit: import_zod2.z.number().min(1).max(100).default(50)
    })).query(async ({ input, ctx }) => {
      return await getUserNotifications(ctx.user.id, input.limit);
    }),
    unread: protectedProcedure.query(async ({ ctx }) => {
      return await getUnreadNotifications(ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await countUnreadNotifications(ctx.user.id);
    }),
    markAsRead: protectedProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(async ({ input, ctx }) => {
      const notification = await getUserNotifications(ctx.user.id, 1e3);
      const exists = notification.some((n) => n.id === input.id);
      if (!exists) {
        throw new import_server2.TRPCError({ code: "FORBIDDEN", message: "Notificaci\xF3n no encontrada" });
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
    monthlyData: protectedProcedure.input(import_zod2.z.object({
      apartmentId: import_zod2.z.number().optional(),
      month: import_zod2.z.string()
    })).query(async ({ input, ctx }) => {
      const apartmentId = input.apartmentId || ctx.user.apartmentId;
      if (!apartmentId) {
        throw new import_server2.TRPCError({ code: "BAD_REQUEST", message: "Apartamento no especificado" });
      }
      if (ctx.user.role !== "admin" && ctx.user.apartmentId !== apartmentId) {
        throw new import_server2.TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver este reporte" });
      }
      const reportData = await getMonthlyReportData(apartmentId, input.month);
      if (!reportData) {
        throw new import_server2.TRPCError({ code: "NOT_FOUND", message: "Reporte no encontrado" });
      }
      return reportData;
    }),
    userSummary: protectedProcedure.query(async ({ ctx }) => {
      return await getUserPaymentsSummary(ctx.user.id);
    }),
    debtsSummary: adminProcedure2.input(import_zod2.z.object({ month: import_zod2.z.string() })).query(async ({ input }) => {
      return await getMonthlyDebtsSummary(input.month);
    }),
    paymentsByStatus: adminProcedure2.input(import_zod2.z.object({
      status: import_zod2.z.enum(["pending", "approved", "rejected"]),
      month: import_zod2.z.string().optional()
    })).query(async ({ input }) => {
      return await getPaymentsByStatus(input.status, input.month);
    }),
    exportJSON: protectedProcedure.input(import_zod2.z.object({
      apartmentId: import_zod2.z.number().optional(),
      month: import_zod2.z.string()
    })).query(async ({ input, ctx }) => {
      const apartmentId = input.apartmentId || ctx.user.apartmentId;
      if (!apartmentId) {
        throw new import_server2.TRPCError({ code: "BAD_REQUEST", message: "Apartamento no especificado" });
      }
      if (ctx.user.role !== "admin" && ctx.user.apartmentId !== apartmentId) {
        throw new import_server2.TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para exportar este reporte" });
      }
      const reportJSON = await generateReportJSON(apartmentId, input.month);
      if (!reportJSON) {
        throw new import_server2.TRPCError({ code: "NOT_FOUND", message: "Reporte no encontrado" });
      }
      return reportJSON;
    }),
    paymentStatusExport: adminProcedure2.input(import_zod2.z.object({
      month: import_zod2.z.string().optional()
    })).query(async ({ input }) => {
      const month = input.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const sortBy = "floor";
      const debts = await getAllApartmentsWithDebtStatus(month, sortBy);
      const totalApartments = debts.length;
      const apartmentsWithDebt = debts.filter((d) => !d.isPaid);
      const apartmentsWithoutDebt = totalApartments - apartmentsWithDebt.length;
      const totalPending = apartmentsWithDebt.reduce((sum, d) => sum + parseFloat(d.pendingAmount), 0);
      const totalDue = debts.reduce((sum, d) => sum + parseFloat(d.totalDue), 0);
      const config = await getCondominiumConfig();
      return {
        month,
        condominiumName: config?.name || "Condominio",
        debts,
        summary: {
          total: totalApartments,
          paid: apartmentsWithoutDebt,
          pending: apartmentsWithDebt.length,
          totalDue,
          totalPending
        }
      };
    }),
    downloadPDF: adminProcedure2.input(import_zod2.z.object({
      month: import_zod2.z.string().optional()
    })).query(async ({ input }) => {
      const month = input.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const sortBy = "floor";
      const debts = await getAllApartmentsWithDebtStatus(month, sortBy);
      const totalApartments = debts.length;
      const apartmentsWithDebt = debts.filter((d) => !d.isPaid);
      const apartmentsWithoutDebt = totalApartments - apartmentsWithDebt.length;
      const totalPending = apartmentsWithDebt.reduce((sum, d) => sum + parseFloat(d.pendingAmount), 0);
      const totalDue = debts.reduce((sum, d) => sum + parseFloat(d.totalDue), 0);
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
          paid: apartmentsWithoutDebt,
          pending: apartmentsWithDebt.length,
          totalDue,
          totalPending
        }
      });
      return { buffer: pdfBuffer.toString("base64"), filename: `Estado-Pagos-${month}.pdf` };
    }),
    downloadExcel: adminProcedure2.input(import_zod2.z.object({
      month: import_zod2.z.string().optional()
    })).query(async ({ input }) => {
      const month = input.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const sortBy = "floor";
      const debts = await getAllApartmentsWithDebtStatus(month, sortBy);
      const totalApartments = debts.length;
      const apartmentsWithDebt = debts.filter((d) => !d.isPaid);
      const apartmentsWithoutDebt = totalApartments - apartmentsWithDebt.length;
      const totalPending = apartmentsWithDebt.reduce((sum, d) => sum + parseFloat(d.pendingAmount), 0);
      const totalDue = debts.reduce((sum, d) => sum + parseFloat(d.totalDue), 0);
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
          paid: apartmentsWithoutDebt,
          pending: apartmentsWithDebt.length,
          totalDue,
          totalPending
        }
      });
      return { buffer: excelBuffer.toString("base64"), filename: `Estado-Pagos-${month}.xlsx` };
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
        user = await getUserByEmail(supabaseUser.email);
        if (!user) {
          const newUser = await createUserFromSupabase({
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email.split("@")[0]
          });
          if (newUser) {
            user = newUser;
          }
        }
        if (user && (!user.isActive || user.approvalStatus && user.approvalStatus !== "approved")) {
          user = null;
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
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
app.use(
  "/api/trpc",
  (0, import_express2.createExpressMiddleware)({
    router: appRouter,
    createContext
  })
);
var entry_default = app;
