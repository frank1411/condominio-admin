CREATE TABLE `apartments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`floorId` int NOT NULL,
	`apartmentNumber` varchar(50) NOT NULL,
	`unitName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apartments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`currency` enum('USD','VES') DEFAULT 'USD',
	`isRecurring` boolean DEFAULT true,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `condominiumConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) DEFAULT 'Mi Condominio',
	`floors` int DEFAULT 5,
	`apartmentsPerFloor` int DEFAULT 6,
	`baseFee` decimal(10,2) DEFAULT '0.00',
	`defaultCurrency` enum('USD','VES') DEFAULT 'USD',
	`exchangeRate` decimal(10,4) DEFAULT '1.0000',
	`reminderDay` int DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `condominiumConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `floors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`floorNumber` int NOT NULL,
	`floorName` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `floors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthlyDebts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apartmentId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`baseFeeAmount` decimal(10,2) NOT NULL,
	`additionalCharges` decimal(10,2) DEFAULT '0.00',
	`totalDue` decimal(10,2) NOT NULL,
	`totalPaid` decimal(10,2) DEFAULT '0.00',
	`pendingAmount` decimal(10,2) NOT NULL,
	`currency` enum('USD','VES') DEFAULT 'USD',
	`isPaid` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyDebts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apartmentId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`voucherNumber` varchar(100),
	`voucherImage` longtext,
	`amount` decimal(10,2) NOT NULL,
	`currency` enum('USD','VES') DEFAULT 'USD',
	`status` enum('pending','approved','rejected') DEFAULT 'pending',
	`notes` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apartmentId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`message` text,
	`sentAt` timestamp,
	`status` enum('pending','sent','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `apartmentId` int;