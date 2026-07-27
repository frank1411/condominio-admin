CREATE INDEX "idx_auditlog_user_created" ON "auditLog" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_auditlog_action" ON "auditLog" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_debts_apartment_month" ON "monthlyDebts" USING btree ("apartmentId","month");--> statement-breakpoint
CREATE INDEX "idx_debts_month" ON "monthlyDebts" USING btree ("month");--> statement-breakpoint
CREATE INDEX "idx_debts_charge_id" ON "monthlyDebts" USING btree ("chargeId");--> statement-breakpoint
CREATE INDEX "idx_notif_user_read_created" ON "notifications" USING btree ("userId","isRead","createdAt");--> statement-breakpoint
CREATE INDEX "idx_payments_apartment_month" ON "payments" USING btree ("apartmentId","month");--> statement-breakpoint
CREATE INDEX "idx_payments_user_month" ON "payments" USING btree ("userId","month");--> statement-breakpoint
CREATE INDEX "idx_payments_status_created" ON "payments" USING btree ("status","createdAt");