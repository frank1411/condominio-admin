import { relations } from "drizzle-orm";
import {
  users,
  condominiumConfig,
  floors,
  apartments,
  charges,
  payments,
  monthlyDebts,
  reminders,
  auditLog,
  notifications,
} from "./schema";

// ============================================
// USERS
// ============================================
export const usersRelations = relations(users, ({ one, many }) => ({
  apartment: one(apartments, {
    fields: [users.apartmentId],
    references: [apartments.id],
  }),
  approvedByAdmin: one(users, {
    fields: [users.approvedBy],
    references: [users.id],
  }),
  payments: many(payments),
  reminders: many(reminders),
  auditLogs: many(auditLog),
  notifications: many(notifications),
}));

// ============================================
// FLOORS
// ============================================
export const floorsRelations = relations(floors, ({ many }) => ({
  apartments: many(apartments),
}));

// ============================================
// APARTMENTS
// ============================================
export const apartmentsRelations = relations(apartments, ({ one, many }) => ({
  floor: one(floors, {
    fields: [apartments.floorId],
    references: [floors.id],
  }),
  residents: many(users),
  charges: many(charges),
  payments: many(payments),
  monthlyDebts: many(monthlyDebts),
  reminders: many(reminders),
}));

// ============================================
// CHARGES
// ============================================
export const chargesRelations = relations(charges, ({ one, many }) => ({
  apartment: one(apartments, {
    fields: [charges.apartmentId],
    references: [apartments.id],
  }),
  monthlyDebts: many(monthlyDebts),
}));

// ============================================
// PAYMENTS
// ============================================
export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  apartment: one(apartments, {
    fields: [payments.apartmentId],
    references: [apartments.id],
  }),
  reviewer: one(users, {
    fields: [payments.reviewedBy],
    references: [users.id],
  }),
}));

// ============================================
// MONTHLY DEBTS
// ============================================
export const monthlyDebtsRelations = relations(monthlyDebts, ({ one }) => ({
  apartment: one(apartments, {
    fields: [monthlyDebts.apartmentId],
    references: [apartments.id],
  }),
  charge: one(charges, {
    fields: [monthlyDebts.chargeId],
    references: [charges.id],
  }),
}));

// ============================================
// REMINDERS
// ============================================
export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
  apartment: one(apartments, {
    fields: [reminders.apartmentId],
    references: [apartments.id],
  }),
}));

// ============================================
// AUDIT LOG
// ============================================
export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

// ============================================
// NOTIFICATIONS
// ============================================
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
