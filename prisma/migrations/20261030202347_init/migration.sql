-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BARBER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FULL', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MOCK', 'NEONET');

-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('NONE', 'PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('VACATION', 'DAY_OFF', 'BLOCK');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'REMINDER', 'CANCELLED', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMPTZ(3),
    "image" TEXT,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barber" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "acceptsBookings" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Barber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "bufferMin" INTEGER NOT NULL DEFAULT 10,
    "category" TEXT NOT NULL DEFAULT 'General',
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "openMinute" INTEGER NOT NULL,
    "closeMinute" INTEGER NOT NULL,
    "breakStartMinute" INTEGER,
    "breakEndMinute" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarberSchedule" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BarberSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "barberId" TEXT,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "type" "AvailabilityType" NOT NULL DEFAULT 'BLOCK',
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "totalCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "amountDueCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledReason" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "reminderSentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MOCK',
    "providerRef" TEXT,
    "externalId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL DEFAULT 'FULL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "authorizationCode" TEXT,
    "receiptUrl" TEXT,
    "checkoutUrl" TEXT,
    "failureReason" TEXT,
    "rawStatus" TEXT,
    "paidAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentId" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "customerId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "type" "NotificationType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "providerRef" TEXT,
    "error" TEXT,
    "scheduledFor" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL DEFAULT 'Navaja Barber Studio',
    "tagline" TEXT NOT NULL DEFAULT 'Cortes de autor en el corazón de Guatemala',
    "description" TEXT,
    "logoUrl" TEXT,
    "phone" TEXT NOT NULL DEFAULT '+502 5555 1234',
    "whatsapp" TEXT NOT NULL DEFAULT '50255551234',
    "email" TEXT NOT NULL DEFAULT 'hola@navajabarber.gt',
    "address" TEXT NOT NULL DEFAULT 'Zona 14, Ciudad de Guatemala',
    "mapsUrl" TEXT,
    "mapsEmbedUrl" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala',
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "requirePayment" BOOLEAN NOT NULL DEFAULT true,
    "depositType" "DepositType" NOT NULL DEFAULT 'PERCENT',
    "depositValue" INTEGER NOT NULL DEFAULT 30,
    "minAdvanceMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 45,
    "cancellationHours" INTEGER NOT NULL DEFAULT 12,
    "slotIntervalMin" INTEGER NOT NULL DEFAULT 15,
    "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'MOCK',
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Barber_userId_key" ON "Barber"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Barber_slug_key" ON "Barber"("slug");

-- CreateIndex
CREATE INDEX "Barber_active_displayOrder_idx" ON "Barber"("active", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_active_displayOrder_idx" ON "Service"("active", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_weekday_key" ON "Schedule"("weekday");

-- CreateIndex
CREATE INDEX "Schedule_active_idx" ON "Schedule"("active");

-- CreateIndex
CREATE INDEX "BarberSchedule_barberId_weekday_idx" ON "BarberSchedule"("barberId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "BarberSchedule_barberId_weekday_startMinute_key" ON "BarberSchedule"("barberId", "weekday", "startMinute");

-- CreateIndex
CREATE INDEX "Availability_barberId_startAt_endAt_idx" ON "Availability"("barberId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Availability_startAt_endAt_idx" ON "Availability"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_code_key" ON "Appointment"("code");

-- CreateIndex
CREATE INDEX "Appointment_barberId_startAt_endAt_idx" ON "Appointment"("barberId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Appointment_status_startAt_idx" ON "Appointment"("status", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_customerId_startAt_idx" ON "Appointment"("customerId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_startAt_idx" ON "Appointment"("startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_barberId_startAt_key" ON "Appointment"("barberId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalId_key" ON "Payment"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_appointmentId_status_idx" ON "Payment"("appointmentId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_eventId_key" ON "PaymentEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_provider_receivedAt_idx" ON "PaymentEvent"("provider", "receivedAt");

-- CreateIndex
CREATE INDEX "Notification_status_scheduledFor_idx" ON "Notification"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Notification_appointmentId_idx" ON "Notification"("appointmentId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barber" ADD CONSTRAINT "Barber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarberSchedule" ADD CONSTRAINT "BarberSchedule_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
