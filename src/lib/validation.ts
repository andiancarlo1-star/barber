import { z } from "zod";

const phoneRegex = /^(\+?502[\s-]?)?\d{4}[\s-]?\d{4}$/;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().trim().regex(phoneRegex, "Teléfono inválido (8 dígitos)"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  startAt: z.string().datetime({ offset: true }),
  name: z.string().trim().min(2, "Ingresa tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().trim().regex(phoneRegex, "Teléfono inválido"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  acceptPolicy: z.literal(true, { errorMap: () => ({ message: "Debes aceptar la política" }) }),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(100000),
  durationMin: z.coerce.number().int().min(10).max(480),
  bufferMin: z.coerce.number().int().min(0).max(120),
  category: z.string().trim().min(2).max(40).default("General"),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  active: z.coerce.boolean().optional().default(true),
  displayOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

export const barberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().regex(phoneRegex).optional().or(z.literal("")),
  password: z.string().min(8).max(100).optional().or(z.literal("")),
  title: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  active: z.coerce.boolean().optional().default(true),
  acceptsBookings: z.coerce.boolean().optional().default(true),
  displayOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

export const businessScheduleSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  active: z.coerce.boolean().optional().default(true),
});

export const barberScheduleSchema = z.object({
  barberId: z.string().min(1),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.coerce.boolean().optional().default(true),
});

export const timeOffSchema = z.object({
  barberId: z.string().optional().or(z.literal("")),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  allDay: z.coerce.boolean().optional().default(true),
  type: z.enum(["VACATION", "DAY_OFF", "BLOCK"]).default("DAY_OFF"),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(120),
  description: z.string().trim().max(800).optional().or(z.literal("")),
  phone: z.string().trim().min(8).max(20),
  whatsapp: z.string().trim().min(8).max(20),
  email: z.string().trim().email(),
  address: z.string().trim().min(5).max(200),
  mapsUrl: z.string().trim().url().optional().or(z.literal("")),
  mapsEmbedUrl: z.string().trim().url().optional().or(z.literal("")),
  instagram: z.string().trim().url().optional().or(z.literal("")),
  facebook: z.string().trim().url().optional().or(z.literal("")),
  requirePayment: z.coerce.boolean().optional().default(false),
  depositType: z.enum(["NONE", "PERCENT", "FIXED"]),
  depositValue: z.coerce.number().min(0).max(100000),
  minAdvanceMinutes: z.coerce.number().int().min(0).max(10080),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  cancellationHours: z.coerce.number().int().min(0).max(168),
  slotIntervalMin: z.coerce.number().int().min(5).max(60),
  paymentProvider: z.enum(["MOCK", "NEONET"]),
});

export const manualAppointmentSchema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().regex(phoneRegex),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["CONFIRMED", "COMPLETED"]).default("CONFIRMED"),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre").max(80),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().trim().regex(phoneRegex, "Teléfono inválido"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const cancelSchema = z.object({
  appointmentId: z.string().min(1),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
