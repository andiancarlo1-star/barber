import { cache } from "react";
import type { BusinessSettings } from "@prisma/client";
import { prisma } from "./prisma";

export const DEFAULT_SETTINGS = {
  id: "default",
  businessName: "Navaja Barber Studio",
  tagline: "Cortes de autor en el corazón de Guatemala",
  description:
    "Una barbería boutique donde la tradición del oficio se encuentra con el diseño contemporáneo. Reserva tu turno y vive la experiencia Navaja.",
  logoUrl: null,
  phone: "+502 5555 1234",
  whatsapp: "50255551234",
  email: "hola@navajabarber.gt",
  address: "Zona 14, Ciudad de Guatemala",
  mapsUrl: "https://maps.google.com/?q=Zona+14+Ciudad+de+Guatemala",
  mapsEmbedUrl:
    "https://www.google.com/maps?q=Zona%2014%2C%20Ciudad%20de%20Guatemala&output=embed",
  instagram: "https://instagram.com",
  facebook: "https://facebook.com",
  timezone: "America/Guatemala",
  currency: "GTQ",
  requirePayment: true,
  depositType: "PERCENT",
  depositValue: 30,
  minAdvanceMinutes: 120,
  maxAdvanceDays: 45,
  cancellationHours: 12,
  slotIntervalMin: 15,
  paymentProvider: "MOCK",
} as const;

export type SettingsLike = Pick<
  BusinessSettings,
  | "id"
  | "businessName"
  | "tagline"
  | "description"
  | "logoUrl"
  | "phone"
  | "whatsapp"
  | "email"
  | "address"
  | "mapsUrl"
  | "mapsEmbedUrl"
  | "instagram"
  | "facebook"
  | "timezone"
  | "currency"
  | "requirePayment"
  | "depositType"
  | "depositValue"
  | "minAdvanceMinutes"
  | "maxAdvanceDays"
  | "cancellationHours"
  | "slotIntervalMin"
  | "paymentProvider"
>;

export const getSettings = cache(async (): Promise<SettingsLike> => {
  try {
    const settings = await prisma.businessSettings.findUnique({ where: { id: "default" } });
    if (settings) return settings;
  } catch {
    // La base de datos puede no estar disponible durante el build.
  }
  return DEFAULT_SETTINGS as unknown as SettingsLike;
});

export function depositFor(totalCents: number, settings: SettingsLike): number {
  if (!settings.requirePayment || settings.depositType === "NONE") return 0;
  if (settings.depositType === "FIXED") {
    return Math.min(Math.max(settings.depositValue, 0), totalCents);
  }
  const pct = Math.min(Math.max(settings.depositValue, 0), 100);
  return Math.round((totalCents * pct) / 100);
}
