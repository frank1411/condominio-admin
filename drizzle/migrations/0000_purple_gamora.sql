CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('USD', 'VES');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('payment_approved', 'payment_rejected', 'payment_received', 'debt_created', 'debt_paid', 'reminder', 'system');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "apartments" (
	"id" serial PRIMARY KEY NOT NULL,
	"floorId" integer NOT NULL,
	"apartmentNumber" varchar(50) NOT NULL,
	"unitName" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"action" varchar(255) NOT NULL,
	"entityType" varchar(100),
	"entityId" integer,
	"details" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'USD',
	"isRecurring" boolean DEFAULT true,
	"isActive" boolean DEFAULT true,
	"apartmentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condominiumConfig" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) DEFAULT 'Mi Condominio',
	"floors" integer DEFAULT 5,
	"apartmentsPerFloor" integer DEFAULT 6,
	"baseFee" numeric(10, 2) DEFAULT '0.00',
	"defaultCurrency" "currency" DEFAULT 'USD',
	"exchangeRate" numeric(10, 4) DEFAULT '1.0000',
	"reminderDay" integer DEFAULT 5,
	"apartmentNamePattern" varchar(255) DEFAULT 'Apt-{piso}-{numero}',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" serial PRIMARY KEY NOT NULL,
	"floorNumber" integer NOT NULL,
	"floorName" varchar(100) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthlyDebts" (
	"id" serial PRIMARY KEY NOT NULL,
	"apartmentId" integer NOT NULL,
	"chargeId" integer,
	"month" varchar(7) NOT NULL,
	"totalDue" numeric(10, 2) NOT NULL,
	"totalPaid" numeric(10, 2) DEFAULT '0.00',
	"pendingAmount" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'USD',
	"isPaid" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"relatedEntityType" varchar(100),
	"relatedEntityId" integer,
	"isRead" boolean DEFAULT false,
	"actionUrl" varchar(512),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"apartmentId" integer NOT NULL,
	"month" varchar(7) NOT NULL,
	"voucherNumber" varchar(100),
	"voucherImage" text,
	"voucherImageUrl" varchar(500),
	"voucherImageKey" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'USD',
	"status" "payment_status" DEFAULT 'pending',
	"notes" text,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedAt" timestamp,
	"reviewedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"apartmentId" integer NOT NULL,
	"month" varchar(7) NOT NULL,
	"message" text,
	"sentAt" timestamp,
	"status" "reminder_status" DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"apartmentId" integer,
	"isApproved" boolean DEFAULT false,
	"approvalStatus" "approval_status" DEFAULT 'pending',
	"approvedBy" integer,
	"approvedAt" timestamp,
	"rejectionReason" text,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
