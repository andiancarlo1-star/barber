import { addMinutes } from "date-fns";
import type { Appointment, AppointmentStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { getSettings, depositFor, type SettingsLike } from "./settings";
import { getAvailabilityRange, isSlotFree } from "./availability";
import { dateKeyInTZ, zonedToUtc } from "./dates";
import { generateCode } from "./utils";
import { notifyAppointment } from "./notifications";
import { logAudit } from "./audit";
import { isUniqueViolation } from "./payments/process";

export class BookingError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "BookingError";
    this.code = code;
    this.status = status;
  }
}

export type BookingCustomer = {
  name: string;
  email: string;
  phone: string;
  notes?: string | null;
};

export type CreateAppointmentInput = {
  serviceId: string;
  barberId: string;
  startAt: string | Date;
  customer: BookingCustomer;
  notes?: string | null;
  userId?: string | null;
  createdById?: string | null;
  confirmImmediately?: boolean;
  enforceAdvance?: boolean;
};

export type CreatedAppointment = {
  appointment: Appointment;
  requiresPayment: boolean;
  amountDueCents: number;
};

export async function createAppointment(input: CreateAppointmentInput): Promise<CreatedAppointment> {
  const settings = await getSettings();
  const startAt = typeof input.startAt === "string" ? new Date(input.startAt) : input.startAt;

  if (Number.isNaN(startAt.getTime())) {
    throw new BookingError("INVALID_DATE", "La fecha seleccionada no es válida");
  }

  const [service, barber] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.serviceId, active: true } }),
    prisma.barber.findFirst({
      where: { id: input.barberId, active: true, acceptsBookings: true },
      include: { user: true },
    }),
  ]);

  if (!service) throw new BookingError("SERVICE_NOT_FOUND", "El servicio no está disponible", 404);
  if (!barber || !barber.user.active) {
    throw new BookingError("BARBER_NOT_FOUND", "El barbero no está disponible", 404);
  }

  const endAt = addMinutes(startAt, service.durationMin);
  const now = new Date();
  const minStart = addMinutes(now, settings.minAdvanceMinutes);

  if (startAt <= now) {
    throw new BookingError("IN_PAST", "No puedes reservar en el pasado");
  }
  if (input.enforceAdvance !== false && startAt < minStart) {
    throw new BookingError(
      "TOO_SOON",
      `Debes reservar con al menos ${Math.round(settings.minAdvanceMinutes / 60)} horas de anticipación`,
    );
  }

  if (input.enforceAdvance !== false) {
    const day = await getAvailabilityRange({
      service,
      barberId: input.barberId,
      fromKey: dateKeyInTZ(startAt),
      days: 1,
      settings,
    });
    const available = day[0]?.slots.some(
      (slot) => new Date(slot.startAt).getTime() === startAt.getTime(),
    );
    if (!available) {
      throw new BookingError("SLOT_TAKEN", "Ese horario ya no está disponible. Elige otro.", 409);
    }
  }

  const deposit = depositFor(service.priceCents, settings);
  const requiresPayment = Boolean(settings.requirePayment && deposit > 0 && !input.confirmImmediately);
  const status: AppointmentStatus = requiresPayment ? "PENDING_PAYMENT" : "CONFIRMED";
  const amountDueCents = requiresPayment ? deposit : 0;

  let appointment: Appointment;
  try {
    appointment = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.barberId}))`;

      const conflict = await tx.appointment.findFirst({
        where: {
          barberId: input.barberId,
          status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
          startAt: { lt: addMinutes(endAt, service.bufferMin) },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new BookingError("SLOT_TAKEN", "Ese horario acaba de ser reservado. Elige otro.", 409);
      }

      const block = await tx.availability.findFirst({
        where: {
          OR: [{ barberId: input.barberId }, { barberId: null }],
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });
      if (block) {
        throw new BookingError("SLOT_BLOCKED", "El barbero no está disponible en ese horario.", 409);
      }

      const email = input.customer.email.trim().toLowerCase();
      let customer = await tx.customer.findUnique({ where: { email } });
      if (customer) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: input.customer.name.trim(),
            phone: input.customer.phone.trim(),
            ...(input.userId && !customer.userId ? { userId: input.userId } : {}),
            ...(input.customer.notes ? { notes: input.customer.notes } : {}),
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            name: input.customer.name.trim(),
            email,
            phone: input.customer.phone.trim(),
            userId: input.userId ?? null,
            notes: input.customer.notes ?? null,
          },
        });
      }

      return tx.appointment.create({
        data: {
          code: generateCode(),
          customerId: customer.id,
          barberId: input.barberId,
          serviceId: service.id,
          startAt,
          endAt,
          status,
          totalCents: service.priceCents,
          depositCents: deposit,
          amountDueCents,
          currency: settings.currency,
          notes: input.notes?.trim() || null,
          createdById: input.createdById ?? null,
        },
      });
    });
  } catch (error) {
    if (error instanceof BookingError) throw error;
    if (isUniqueViolation(error)) {
      throw new BookingError("SLOT_TAKEN", "Ese horario acaba de ser reservado. Elige otro.", 409);
    }
    throw error;
  }

  if (!requiresPayment) {
    await notifyAppointment(appointment.id, "BOOKING_CONFIRMED").catch((error) =>
      console.error("[notify] booking confirmed", error),
    );
  }

  await logAudit({
    userId: input.createdById ?? null,
    action: "APPOINTMENT_CREATED",
    entity: "Appointment",
    entityId: appointment.id,
    metadata: {
      code: appointment.code,
      barberId: input.barberId,
      serviceId: input.serviceId,
      startAt: startAt.toISOString(),
      requiresPayment,
    },
  });

  return { appointment, requiresPayment, amountDueCents };
}

export async function cancelAppointment(options: {
  appointmentId: string;
  reason?: string;
  actorId?: string | null;
  actorRole?: string;
  notify?: boolean;
}): Promise<Appointment> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: options.appointmentId },
    include: { customer: true },
  });
  if (!appointment) throw new BookingError("NOT_FOUND", "Reserva no encontrada", 404);
  if (appointment.status === "CANCELLED") return appointment;
  if (appointment.status === "COMPLETED") {
    throw new BookingError("ALREADY_COMPLETED", "No se puede cancelar una cita completada");
  }

  const settings = await getSettings();
  if (options.actorRole === "CUSTOMER") {
    const hours = (appointment.startAt.getTime() - Date.now()) / 3_600_000;
    if (hours < settings.cancellationHours) {
      throw new BookingError(
        "CANCELLATION_WINDOW",
        `Solo puedes cancelar hasta ${settings.cancellationHours} horas antes de la cita`,
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { appointmentId: appointment.id, status: { in: ["PENDING", "PROCESSING"] } },
      data: { status: "CANCELLED", failureReason: "Reserva cancelada" },
    });
    return tx.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledReason: options.reason ?? "Cancelada",
      },
    });
  });

  await logAudit({
    userId: options.actorId ?? null,
    action: "APPOINTMENT_CANCELLED",
    entity: "Appointment",
    entityId: appointment.id,
    metadata: { code: appointment.code, reason: options.reason, role: options.actorRole },
  });

  if (options.notify !== false) {
    await notifyAppointment(appointment.id, "CANCELLED").catch((error) =>
      console.error("[notify] cancelled", error),
    );
  }

  return updated;
}

export async function completeAppointment(options: {
  appointmentId: string;
  actorId?: string | null;
}): Promise<Appointment> {
  const appointment = await prisma.appointment.findUnique({ where: { id: options.appointmentId } });
  if (!appointment) throw new BookingError("NOT_FOUND", "Reserva no encontrada", 404);
  if (appointment.status === "CANCELLED") {
    throw new BookingError("CANCELLED", "No se puede completar una cita cancelada");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await logAudit({
    userId: options.actorId ?? null,
    action: "APPOINTMENT_COMPLETED",
    entity: "Appointment",
    entityId: appointment.id,
    metadata: { code: appointment.code },
  });

  return updated;
}

export async function markNoShow(options: {
  appointmentId: string;
  actorId?: string | null;
}): Promise<Appointment> {
  const appointment = await prisma.appointment.findUnique({ where: { id: options.appointmentId } });
  if (!appointment) throw new BookingError("NOT_FOUND", "Reserva no encontrada", 404);

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "NO_SHOW" },
  });

  await logAudit({
    userId: options.actorId ?? null,
    action: "APPOINTMENT_NO_SHOW",
    entity: "Appointment",
    entityId: appointment.id,
    metadata: { code: appointment.code },
  });

  return updated;
}

export async function rescheduleAppointment(options: {
  appointmentId: string;
  startAt: string | Date;
  actorId?: string | null;
  actorRole?: string;
  settings?: SettingsLike;
}): Promise<Appointment> {
  const settings = options.settings ?? (await getSettings());
  const startAt = typeof options.startAt === "string" ? new Date(options.startAt) : options.startAt;
  if (Number.isNaN(startAt.getTime())) {
    throw new BookingError("INVALID_DATE", "La fecha no es válida");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: options.appointmentId },
    include: { service: true },
  });
  if (!appointment) throw new BookingError("NOT_FOUND", "Reserva no encontrada", 404);
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    throw new BookingError("INVALID_STATUS", "La reserva no se puede reprogramar");
  }

  const endAt = addMinutes(startAt, appointment.service.durationMin);
  if (startAt <= new Date()) {
    throw new BookingError("IN_PAST", "La nueva fecha debe estar en el futuro");
  }

  const day = await getAvailabilityRange({
    service: appointment.service,
    barberId: appointment.barberId,
    fromKey: dateKeyInTZ(startAt),
    days: 1,
    settings,
    excludeAppointmentId: appointment.id,
  });
  const available = day[0]?.slots.some((slot) => new Date(slot.startAt).getTime() === startAt.getTime());
  if (!available) {
    throw new BookingError("SLOT_TAKEN", "Ese horario no está disponible", 409);
  }

  let updated: Appointment;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${appointment.barberId}))`;

      const free = await isSlotFree({
        barberId: appointment.barberId,
        startAt,
        endAt,
        excludeAppointmentId: appointment.id,
        db: tx,
      });
      if (!free) {
        throw new BookingError("SLOT_TAKEN", "Ese horario acaba de ser reservado", 409);
      }

      return tx.appointment.update({
        where: { id: appointment.id },
        data: { startAt, endAt, reminderSentAt: null },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BookingError("SLOT_TAKEN", "Ese horario acaba de ser reservado", 409);
    }
    throw error;
  }

  await logAudit({
    userId: options.actorId ?? null,
    action: "APPOINTMENT_RESCHEDULED",
    entity: "Appointment",
    entityId: appointment.id,
    metadata: {
      code: appointment.code,
      from: appointment.startAt.toISOString(),
      to: startAt.toISOString(),
      role: options.actorRole,
    },
  });

  await notifyAppointment(appointment.id, "RESCHEDULED").catch((error) =>
    console.error("[notify] rescheduled", error),
  );

  return updated;
}

export async function getAppointmentByCode(code: string) {
  return prisma.appointment.findUnique({
    where: { code },
    include: {
      customer: true,
      service: true,
      barber: { include: { user: true } },
      payments: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });
}

export function appointmentStart(dateKey: string, minutes: number): Date {
  return zonedToUtc(dateKey, minutes);
}
