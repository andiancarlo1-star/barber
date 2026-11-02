"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { addDaysToKey, zonedToUtc, inputToMinutes } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireBarber, requireRole } from "@/lib/auth-helpers";
import {
  BookingError,
  cancelAppointment,
  completeAppointment,
  createAppointment,
  markNoShow,
  rescheduleAppointment,
} from "@/lib/appointments";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import {
  barberSchema,
  businessScheduleSchema,
  customerSchema,
  manualAppointmentSchema,
  serviceSchema,
  settingsSchema,
  timeOffSchema,
} from "@/lib/validation";

export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
} | null;

function bool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function fieldErrorsOf(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return error.flatten().fieldErrors;
}

function withParam(url: string, key: string, value: string): string {
  const parsed = new URL(url, "http://local");
  parsed.searchParams.set(key, value);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function messageOf(error: unknown): string {
  if (error instanceof BookingError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado";
}

async function uniqueSlug(base: string, model: "service" | "barber", excludeId?: string) {
  const root = slugify(base) || "item";
  let slug = root;
  let counter = 1;
  for (;;) {
    const existing =
      model === "service"
        ? await prisma.service.findUnique({ where: { slug }, select: { id: true } })
        : await prisma.barber.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    counter += 1;
    slug = `${root}-${counter}`;
  }
}

/* ---------------------------------- Citas --------------------------------- */

export async function createManualAppointmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = manualAppointmentSchema.safeParse({
    serviceId: formData.get("serviceId"),
    barberId: formData.get("barberId"),
    date: formData.get("date"),
    time: formData.get("time"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
    status: formData.get("status") || "CONFIRMED",
  });

  if (!parsed.success) {
    return { error: "Revisa los datos del formulario", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  let appointmentId: string;
  let code: string;
  try {
    const startAt = zonedToUtc(parsed.data.date, inputToMinutes(parsed.data.time));
    const result = await createAppointment({
      serviceId: parsed.data.serviceId,
      barberId: parsed.data.barberId,
      startAt,
      customer: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        notes: parsed.data.notes || null,
      },
      notes: parsed.data.notes || null,
      createdById: admin.id,
      confirmImmediately: true,
      enforceAdvance: false,
    });
    appointmentId = result.appointment.id;
    code = result.appointment.code;
    if (parsed.data.status === "COMPLETED") {
      await completeAppointment({ appointmentId, actorId: admin.id });
    }
  } catch (error) {
    return { error: messageOf(error) };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/citas");
  redirect(`/admin/citas?ok=${encodeURIComponent(code)}`);
}

export async function updateAppointmentStatusAction(formData: FormData): Promise<void> {
  const user = await requireRole(["ADMIN", "BARBER"]);
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/citas");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, barberId: true, code: true },
  });
  if (!appointment) redirect(`${withParam(redirectTo, "error", "No encontrada")}`);
  if (user.role === "BARBER" && appointment.barberId !== user.barberId) {
    redirect(`${withParam(redirectTo, "error", "No autorizado")}`);
  }

  try {
    if (intent === "complete") {
      await completeAppointment({ appointmentId, actorId: user.id });
    } else if (intent === "noshow") {
      await markNoShow({ appointmentId, actorId: user.id });
    } else if (intent === "cancel") {
      await cancelAppointment({
        appointmentId,
        reason: String(formData.get("reason") ?? "Cancelada por el equipo"),
        actorId: user.id,
        actorRole: user.role,
      });
    } else if (intent === "confirm") {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "CONFIRMED", amountDueCents: 0 },
      });
      await logAudit({
        userId: user.id,
        action: "APPOINTMENT_CONFIRMED_MANUAL",
        entity: "Appointment",
        entityId: appointmentId,
        metadata: { code: appointment.code },
      });
    }
  } catch (error) {
    redirect(`${withParam(redirectTo, "error", messageOf(error))}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/citas");
  revalidatePath("/barbero");
  revalidatePath("/barbero/agenda");
  redirect(`${withParam(redirectTo, "ok", "1")}`);
}

export async function rescheduleAppointmentAction(formData: FormData): Promise<void> {
  const user = await requireRole(["ADMIN", "BARBER"]);
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/citas");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { barberId: true },
  });
  if (!appointment) redirect(`${withParam(redirectTo, "error", "No encontrada")}`);
  if (user.role === "BARBER" && appointment.barberId !== user.barberId) {
    redirect(`${withParam(redirectTo, "error", "No autorizado")}`);
  }

  try {
    await rescheduleAppointment({
      appointmentId,
      startAt: zonedToUtc(date, inputToMinutes(time)),
      actorId: user.id,
      actorRole: user.role,
    });
  } catch (error) {
    redirect(`${withParam(redirectTo, "error", messageOf(error))}`);
  }

  revalidatePath("/admin/citas");
  revalidatePath("/admin/calendario");
  revalidatePath("/barbero/agenda");
  redirect(`${withParam(redirectTo, "ok", "1")}`);
}

export async function saveAppointmentNotesAction(formData: FormData): Promise<void> {
  const user = await requireRole(["ADMIN", "BARBER"]);
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const internalNotes = String(formData.get("internalNotes") ?? "").slice(0, 1000);
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/citas");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { barberId: true },
  });
  if (!appointment) redirect(`${withParam(redirectTo, "error", "No encontrada")}`);
  if (user.role === "BARBER" && appointment.barberId !== user.barberId) {
    redirect(`${withParam(redirectTo, "error", "No autorizado")}`);
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { internalNotes: internalNotes || null },
  });
  await logAudit({
    userId: user.id,
    action: "APPOINTMENT_NOTES_UPDATED",
    entity: "Appointment",
    entityId: appointmentId,
  });
  revalidatePath(redirectTo);
  redirect(`${withParam(redirectTo, "ok", "1")}`);
}

/* -------------------------------- Servicios ------------------------------- */

export async function saveServiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    durationMin: formData.get("durationMin"),
    bufferMin: formData.get("bufferMin"),
    category: formData.get("category") || "General",
    imageUrl: formData.get("imageUrl"),
    displayOrder: formData.get("displayOrder") || 0,
  });

  if (!parsed.success) {
    return { error: "Revisa los datos del servicio", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const data = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    priceCents: Math.round(parsed.data.price * 100),
    durationMin: parsed.data.durationMin,
    bufferMin: parsed.data.bufferMin,
    category: parsed.data.category,
    imageUrl: parsed.data.imageUrl || null,
    active: bool(formData, "active"),
    displayOrder: parsed.data.displayOrder,
  };

  let serviceId = id;
  try {
    if (id) {
      await prisma.service.update({ where: { id }, data });
    } else {
      const slug = await uniqueSlug(parsed.data.name, "service");
      const created = await prisma.service.create({ data: { ...data, slug } });
      serviceId = created.id;
    }
  } catch (error) {
    return { error: messageOf(error) };
  }

  await logAudit({
    userId: admin.id,
    action: id ? "SERVICE_UPDATED" : "SERVICE_CREATED",
    entity: "Service",
    entityId: serviceId,
    metadata: { name: data.name },
  });

  revalidatePath("/admin/servicios");
  revalidatePath("/");
  revalidatePath("/reservar");
  redirect("/admin/servicios?ok=1");
}

export async function toggleServiceAction(formData: FormData): Promise<void> {
  const admin = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) redirect("/admin/servicios?error=No+encontrado");
  await prisma.service.update({ where: { id }, data: { active: !service.active } });
  await logAudit({
    userId: admin.id,
    action: service.active ? "SERVICE_DEACTIVATED" : "SERVICE_ACTIVATED",
    entity: "Service",
    entityId: id,
  });
  revalidatePath("/admin/servicios");
  revalidatePath("/");
  revalidatePath("/reservar");
  redirect("/admin/servicios?ok=1");
}

/* -------------------------------- Barberos -------------------------------- */

export async function saveBarberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const parsed = barberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    title: formData.get("title"),
    bio: formData.get("bio"),
    imageUrl: formData.get("imageUrl"),
    displayOrder: formData.get("displayOrder") || 0,
  });

  if (!parsed.success) {
    return { error: "Revisa los datos del barbero", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (!id && (!parsed.data.password || parsed.data.password.length < 8)) {
    return {
      error: "La contraseña es obligatoria para nuevos barberos",
      fieldErrors: { password: ["Mínimo 8 caracteres"] },
    };
  }

  const email = parsed.data.email;
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, barberProfile: { select: { id: true } } },
  });
  if (existing && existing.barberProfile?.id !== id) {
    return { error: "Ese correo ya está registrado", fieldErrors: { email: ["Correo en uso"] } };
  }

  let barberId = id;
  try {
    if (id) {
      const barber = await prisma.barber.findUnique({ where: { id } });
      if (!barber) return { error: "Barbero no encontrado" };
      await prisma.user.update({
        where: { id: barber.userId },
        data: {
          name: parsed.data.name,
          email,
          phone: parsed.data.phone || null,
          active: bool(formData, "active"),
          ...(parsed.data.password ? { passwordHash: await bcrypt.hash(parsed.data.password, 12) } : {}),
        },
      });
      await prisma.barber.update({
        where: { id },
        data: {
          title: parsed.data.title || null,
          bio: parsed.data.bio || null,
          imageUrl: parsed.data.imageUrl || null,
          active: bool(formData, "active"),
          acceptsBookings: bool(formData, "acceptsBookings"),
          displayOrder: parsed.data.displayOrder,
        },
      });
    } else {
      const slug = await uniqueSlug(parsed.data.name, "barber");
      const created = await prisma.barber.create({
        data: {
          slug,
          title: parsed.data.title || null,
          bio: parsed.data.bio || null,
          imageUrl: parsed.data.imageUrl || null,
          active: true,
          acceptsBookings: true,
          displayOrder: parsed.data.displayOrder,
          user: {
            create: {
              name: parsed.data.name,
              email,
              phone: parsed.data.phone || null,
              passwordHash: await bcrypt.hash(parsed.data.password as string, 12),
              role: "BARBER",
            },
          },
        },
      });
      barberId = created.id;
    }
  } catch (error) {
    return { error: messageOf(error) };
  }

  await logAudit({
    userId: admin.id,
    action: id ? "BARBER_UPDATED" : "BARBER_CREATED",
    entity: "Barber",
    entityId: barberId,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/admin/barberos");
  revalidatePath("/");
  revalidatePath("/reservar");
  redirect(`/admin/barberos/${barberId}?ok=1`);
}

export async function toggleBarberAction(formData: FormData): Promise<void> {
  const admin = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const barber = await prisma.barber.findUnique({ where: { id }, include: { user: true } });
  if (!barber) redirect("/admin/barberos?error=No+encontrado");
  const active = !barber.active;
  await prisma.$transaction(async (tx) => {
    await tx.barber.update({ where: { id }, data: { active, acceptsBookings: active } });
    await tx.user.update({ where: { id: barber.userId }, data: { active } });
  });
  await logAudit({
    userId: admin.id,
    action: active ? "BARBER_ACTIVATED" : "BARBER_DEACTIVATED",
    entity: "Barber",
    entityId: id,
  });
  revalidatePath("/admin/barberos");
  revalidatePath("/");
  revalidatePath("/reservar");
  redirect("/admin/barberos?ok=1");
}

export async function saveBarberSchedulesAction(formData: FormData): Promise<void> {
  const user = await requireRole(["ADMIN", "BARBER"]);
  const barberId = String(formData.get("barberId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? `/admin/barberos/${barberId}`);

  if (user.role === "BARBER" && user.barberId !== barberId) {
    redirect(`${withParam(redirectTo, "error", "No autorizado")}`);
  }

  const rows: Array<{ weekday: number; startMinute: number; endMinute: number }> = [];
  for (let weekday = 0; weekday <= 6; weekday++) {
    const active = bool(formData, `active-${weekday}`);
    if (!active) continue;
    const start = inputToMinutes(String(formData.get(`start-${weekday}`) ?? ""));
    const end = inputToMinutes(String(formData.get(`end-${weekday}`) ?? ""));
    if (end > start) rows.push({ weekday, startMinute: start, endMinute: end });
  }

  await prisma.$transaction(async (tx) => {
    await tx.barberSchedule.deleteMany({ where: { barberId } });
    if (rows.length > 0) {
      await tx.barberSchedule.createMany({
        data: rows.map((row) => ({ ...row, barberId, active: true })),
      });
    }
  });

  await logAudit({
    userId: user.id,
    action: "BARBER_SCHEDULE_UPDATED",
    entity: "Barber",
    entityId: barberId,
    metadata: { rows },
  });
  revalidatePath(redirectTo);
  revalidatePath("/barbero/disponibilidad");
  revalidatePath("/reservar");
  redirect(`${withParam(redirectTo, "ok", "1")}`);
}

/* --------------------------------- Horario -------------------------------- */

export async function saveBusinessSchedulesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole(["ADMIN"]);

  const rows: Array<{
    weekday: number;
    openMinute: number;
    closeMinute: number;
    breakStartMinute: number | null;
    breakEndMinute: number | null;
    active: boolean;
  }> = [];

  for (let weekday = 0; weekday <= 6; weekday++) {
    const parsed = businessScheduleSchema.safeParse({
      weekday,
      openTime: formData.get(`open-${weekday}`),
      closeTime: formData.get(`close-${weekday}`),
      breakStart: formData.get(`breakStart-${weekday}`) ?? "",
      breakEnd: formData.get(`breakEnd-${weekday}`) ?? "",
      active: true,
    });
    if (!parsed.success) {
      return { error: `Horario inválido para ${weekday === 0 ? "domingo" : `día ${weekday}`}` };
    }
    const openMinute = inputToMinutes(parsed.data.openTime);
    const closeMinute = inputToMinutes(parsed.data.closeTime);
    if (closeMinute <= openMinute) {
      return { error: "La hora de cierre debe ser mayor que la de apertura" };
    }
    const breakStartMinute = parsed.data.breakStart ? inputToMinutes(parsed.data.breakStart) : null;
    const breakEndMinute = parsed.data.breakEnd ? inputToMinutes(parsed.data.breakEnd) : null;
    if (
      breakStartMinute != null &&
      breakEndMinute != null &&
      (breakEndMinute <= breakStartMinute ||
        breakStartMinute < openMinute ||
        breakEndMinute > closeMinute)
    ) {
      return { error: "El descanso debe estar dentro del horario y con fin mayor al inicio" };
    }
    rows.push({
      weekday,
      openMinute,
      closeMinute,
      breakStartMinute,
      breakEndMinute,
      active: bool(formData, `active-${weekday}`),
    });
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.schedule.upsert({
        where: { weekday: row.weekday },
        create: row,
        update: row,
      }),
    ),
  );

  await logAudit({
    userId: admin.id,
    action: "BUSINESS_SCHEDULE_UPDATED",
    entity: "Schedule",
  });
  revalidatePath("/admin/horarios");
  revalidatePath("/");
  revalidatePath("/reservar");
  return { success: "Horarios guardados correctamente" };
}

export async function createTimeOffAction(formData: FormData): Promise<void> {
  const user = await requireRole(["ADMIN", "BARBER"]);
  const parsed = timeOffSchema.safeParse({
    barberId: formData.get("barberId") ?? "",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    allDay: true,
    type: formData.get("type") || "DAY_OFF",
    reason: formData.get("reason"),
  });
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/horarios");
  if (!parsed.success) redirect(`${withParam(redirectTo, "error", "Datos inválidos")}`);

  const barberId = parsed.data.barberId || null;
  if (user.role === "BARBER") {
    if (barberId && barberId !== user.barberId) redirect(`${withParam(redirectTo, "error", "No autorizado")}`);
  }
  const finalBarberId = user.role === "BARBER" ? user.barberId : barberId;

  await prisma.availability.create({
    data: {
      barberId: finalBarberId,
      startAt: zonedToUtc(parsed.data.startDate, 0),
      endAt: zonedToUtc(addDaysToKey(parsed.data.endDate, 1), 0),
      allDay: true,
      type: parsed.data.type,
      reason: parsed.data.reason || null,
      createdById: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    action: "TIME_OFF_CREATED",
    entity: "Availability",
    metadata: { ...parsed.data, barberId: finalBarberId },
  });
  revalidatePath(redirectTo);
  revalidatePath("/barbero/disponibilidad");
  revalidatePath("/reservar");
  redirect(`${withParam(redirectTo, "ok", "1")}`);
}

export async function deleteTimeOffAction(formData: FormData): Promise<void> {
  const user = await requireRole(["ADMIN", "BARBER"]);
  const id = String(formData.get("id") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/horarios");
  const block = await prisma.availability.findUnique({ where: { id } });
  if (!block) redirect(`${withParam(redirectTo, "error", "No encontrado")}`);
  if (user.role === "BARBER" && block.barberId !== user.barberId) {
    redirect(`${withParam(redirectTo, "error", "No autorizado")}`);
  }
  await prisma.availability.delete({ where: { id } });
  await logAudit({
    userId: user.id,
    action: "TIME_OFF_DELETED",
    entity: "Availability",
    entityId: id,
  });
  revalidatePath(redirectTo);
  revalidatePath("/reservar");
  redirect(`${withParam(redirectTo, "ok", "1")}`);
}

/* ------------------------------ Configuración ----------------------------- */

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = settingsSchema.safeParse({
    businessName: formData.get("businessName"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    address: formData.get("address"),
    mapsUrl: formData.get("mapsUrl"),
    mapsEmbedUrl: formData.get("mapsEmbedUrl"),
    instagram: formData.get("instagram"),
    facebook: formData.get("facebook"),
    depositType: formData.get("depositType"),
    depositValue: formData.get("depositValue"),
    minAdvanceMinutes: formData.get("minAdvanceMinutes"),
    maxAdvanceDays: formData.get("maxAdvanceDays"),
    cancellationHours: formData.get("cancellationHours"),
    slotIntervalMin: formData.get("slotIntervalMin"),
    paymentProvider: formData.get("paymentProvider"),
  });

  if (!parsed.success) {
    return { error: "Revisa la configuración", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  await prisma.businessSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...parsed.data,
      description: parsed.data.description || null,
      mapsUrl: parsed.data.mapsUrl || null,
      mapsEmbedUrl: parsed.data.mapsEmbedUrl || null,
      instagram: parsed.data.instagram || null,
      facebook: parsed.data.facebook || null,
      requirePayment: bool(formData, "requirePayment"),
    },
    update: {
      ...parsed.data,
      description: parsed.data.description || null,
      mapsUrl: parsed.data.mapsUrl || null,
      mapsEmbedUrl: parsed.data.mapsEmbedUrl || null,
      instagram: parsed.data.instagram || null,
      facebook: parsed.data.facebook || null,
      requirePayment: bool(formData, "requirePayment"),
    },
  });

  await logAudit({
    userId: admin.id,
    action: "SETTINGS_UPDATED",
    entity: "BusinessSettings",
    entityId: "default",
    metadata: { paymentProvider: parsed.data.paymentProvider },
  });
  revalidatePath("/");
  revalidatePath("/reservar");
  revalidatePath("/admin/configuracion");
  return { success: "Configuración guardada" };
}

/* -------------------------------- Clientes -------------------------------- */

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(["ADMIN", "BARBER"]);
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres" };
  if (next !== confirm) return { error: "Las contraseñas nuevas no coinciden" };

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await bcrypt.compare(current, record.passwordHash))) {
    return { error: "La contraseña actual es incorrecta" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  await logAudit({
    userId: user.id,
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: user.id,
  });
  return { success: "Contraseña actualizada. Usa la nueva en tu próximo ingreso." };
}

export async function saveCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: "Revisa los datos del cliente", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const duplicate = await prisma.customer.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (duplicate && duplicate.id !== id) {
    return { error: "Ese correo ya pertenece a otro cliente", fieldErrors: { email: ["Correo en uso"] } };
  }

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        notes: parsed.data.notes || null,
      },
    });
  } catch (error) {
    return { error: messageOf(error) };
  }

  await logAudit({
    userId: admin.id,
    action: "CUSTOMER_UPDATED",
    entity: "Customer",
    entityId: id,
    metadata: { name: parsed.data.name },
  });
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { success: "Datos del cliente actualizados" };
}

export async function updateMyAvailabilityAction(formData: FormData): Promise<void> {
  const { barberId } = await requireBarber();
  const redirectTo = String(formData.get("redirectTo") ?? "/barbero/disponibilidad");
  const rows: Array<{ weekday: number; startMinute: number; endMinute: number }> = [];
  for (let weekday = 0; weekday <= 6; weekday++) {
    if (!bool(formData, `active-${weekday}`)) continue;
    const start = inputToMinutes(String(formData.get(`start-${weekday}`) ?? ""));
    const end = inputToMinutes(String(formData.get(`end-${weekday}`) ?? ""));
    if (end > start) rows.push({ weekday, startMinute: start, endMinute: end });
  }
  await prisma.$transaction(async (tx) => {
    await tx.barberSchedule.deleteMany({ where: { barberId } });
    if (rows.length > 0) {
      await tx.barberSchedule.createMany({
        data: rows.map((row) => ({ ...row, barberId, active: true })),
      });
    }
  });
  revalidatePath(redirectTo);
  revalidatePath("/reservar");
  redirect(`${withParam(redirectTo, "ok", "1")}`);
}
