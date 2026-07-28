// Barrel re-export - all database functions organized by domain module
// Existing imports: import * as db from "./db" — continue to work via this barrel

// Connection
export { getDb } from "./client";

// Users
export {
  upsertUser,
  getUserByOpenId,
  getUserById,
  getUserByEmail,
  createUserFromSupabase,
  getAllUsers,
  getUsersByRole,
  getPendingUsers,
  updateUser,
  changeUserRole,
  deleteUser,
  toggleUserActive,
} from "./users";

// Condominium (config, floors, apartments, naming)
export {
  getCondominiumConfig,
  updateCondominiumConfig,
  initializeCondominiumConfig,
  initializeFloorsAndApartments,
  getAllFloors,
  getAllApartments,
  getApartmentsByFloor,
  generateApartmentName,
  generatePatternExamples,
  generateAllApartmentNames,
  updateApartmentName,
} from "./condominium";

// Charges
export {
  getAllCharges,
  createCharge,
  updateCharge,
  deleteCharge,
} from "./charges";

// Payments (includes validation, vouchers, approvals)
export {
  createPayment,
  getPaymentsByApartment,
  getPendingPayments,
  updatePaymentStatus,
  getPaymentById,
  applyPaymentToDebts,
  validatePaymentAmount,
  checkDuplicatePayment,
  validatePaymentMonth,
  approvePaymentWithValidations,
  uploadPaymentVoucher,
  getPaymentVoucherUrl,
  deletePaymentVoucher,
} from "./payments";

// Monthly debts
export {
  getMonthlyDebt,
  createOrUpdateMonthlyDebt,
  getDebtsByMonth,
  getAllUserDebts,
  generateDebtsFromCharge,
  hasAnyPendingDebt,
  getAllApartmentDebts,
  getAllApartmentsWithDebtStatus,
  computeDebtSummary,
} from "./debts";

// Notifications
export {
  createNotification,
  getUnreadNotifications,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  countUnreadNotifications,
  notifyPaymentApproved,
  notifyPaymentRejected,
  notifyAdminNewPayment,
  notifyNewDebt,
  notifyDebtPaid,
} from "./notifications";

// Reminders
export {
  createReminder,
  getPendingReminders,
  updateReminderStatus,
} from "./reminders";

// Audit
export {
  createAuditLog,
} from "./audit";

// Reports
export {
  getMonthlyReportData,
  getUserPaymentsSummary,
  getMonthlyDebtsSummary,
  getPaymentsByStatus,
  generateReportJSON,
} from "./reports";
