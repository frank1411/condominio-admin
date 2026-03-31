CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('payment_approved','payment_rejected','payment_received','debt_created','debt_paid','reminder','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedEntityType` varchar(100),
	`relatedEntityId` int,
	`isRead` boolean DEFAULT false,
	`actionUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
