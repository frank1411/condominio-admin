ALTER TABLE `users` ADD `isApproved` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `rejectionReason` text;