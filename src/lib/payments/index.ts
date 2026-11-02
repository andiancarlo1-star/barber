import type { PaymentProvider } from "@prisma/client";
import { prisma } from "../prisma";
import { generateExternalId, absoluteUrl } from "../utils";
import { getSettings, type SettingsLike } from "../settings";
import { mockProvider } from "./mock";
import { neonetProvider } from "./neonet";
import type { PaymentProviderAdapter, PaymentIntent } from "./types";
import { PaymentConfigError } from "./types";
import { processPaymentUpdate } from "./process";
import { isMockPaymentsAllowed } from "../env";

export function getPaymentProvider(provider: PaymentProvider): PaymentProviderAdapter {
  return provider === "NEONET" ? neonetProvider : mockProvider;
}

export async function createCheckoutForAppointment(
  appointmentId: string,
  settingsInput?: SettingsLike,
): Promise<{ checkoutUrl: string; paymentId: string }> {
  const settings = settingsInput ?? (await getSettings());
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true, barber: { include: { user: true } } },
  });

  if (!appointment) throw new Error("Reserva no encontrada");
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    throw new Error("La reserva ya no admite pagos");
  }
  if (appointment.status === "CONFIRMED") throw new Error("La reserva ya está confirmada");

  const amount = appointment.amountDueCents > 0 ? appointment.amountDueCents : appointment.totalCents;
  if (amount <= 0) throw new Error("El monto a pagar no es válido");

  const existing = await prisma.payment.findFirst({
    where: { appointmentId, status: { in: ["PENDING", "PROCESSING"] } },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.checkoutUrl) {
    return { checkoutUrl: existing.checkoutUrl, paymentId: existing.id };
  }

  const providerEnum = settings.paymentProvider;
  const adapter = getPaymentProvider(providerEnum);

  const payment =
    existing ??
    (await prisma.payment.create({
      data: {
        appointmentId,
        provider: providerEnum,
        externalId: generateExternalId("NVJ"),
        idempotencyKey: `${appointment.id}-${Date.now()}`,
        type: appointment.amountDueCents < appointment.totalCents ? "DEPOSIT" : "FULL",
        amountCents: amount,
        currency: appointment.currency,
        status: "PENDING",
      },
    }));

  const intent: PaymentIntent = {
    paymentId: payment.id,
    appointmentId: appointment.id,
    externalId: payment.externalId,
    amountCents: payment.amountCents,
    currency: payment.currency,
    description: `${appointment.service.name} · ${appointment.code}`,
    customerName: appointment.customer.name,
    customerEmail: appointment.customer.email,
    customerPhone: appointment.customer.phone,
  };

  try {
    const checkout = await adapter.createCheckout(intent);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        checkoutUrl: checkout.checkoutUrl,
        providerRef: checkout.providerRef ?? payment.providerRef,
        provider: providerEnum,
      },
    });
    return { checkoutUrl: checkout.checkoutUrl, paymentId: payment.id };
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureReason:
          error instanceof PaymentConfigError
            ? error.message
            : "No se pudo iniciar el pago con la pasarela",
      },
    });
    throw error;
  }
}

export async function confirmMockPayment(options: {
  paymentId: string;
  outcome: "APPROVED" | "DECLINED";
}): Promise<{ ok: boolean; message: string; code?: string }> {
  if (!isMockPaymentsAllowed()) {
    return { ok: false, message: "La simulación de pagos está deshabilitada" };
  }

  const settings = await getSettings();
  if (settings.paymentProvider !== "MOCK" || process.env.PAYMENT_PROVIDER === "NEONET") {
    return { ok: false, message: "La simulación de pagos está deshabilitada" };
  }

  const payment = await prisma.payment.findUnique({
    where: { id: options.paymentId },
    include: { appointment: true },
  });
  if (!payment) return { ok: false, message: "Pago no encontrado" };
  if (payment.provider !== "MOCK") return { ok: false, message: "Proveedor inválido" };

  const approved = options.outcome === "APPROVED";
  const parsed = {
    eventId: `MOCK-${payment.id}-${approved ? "OK" : "KO"}-${Date.now()}`,
    externalId: payment.externalId,
    status: approved ? ("PAID" as const) : ("FAILED" as const),
    amountCents: payment.amountCents,
    cardBrand: approved ? "VISA" : undefined,
    cardLast4: approved ? "4242" : undefined,
    authorizationCode: approved ? `SIM${Date.now().toString().slice(-6)}` : undefined,
    rawStatus: approved ? "APPROVED" : "DECLINED",
    failureReason: approved ? undefined : "Pago rechazado en simulación",
    raw: { simulated: true, outcome: options.outcome, at: new Date().toISOString() },
  };

  const result = await processPaymentUpdate(parsed, "MOCK");
  return { ok: result.ok, message: result.message, code: payment.appointment.code };
}

export async function getReceiptByCode(code: string) {
  return prisma.appointment.findUnique({
    where: { code },
    include: {
      customer: true,
      service: true,
      barber: { include: { user: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
}

export function paymentReturnUrl(code: string): string {
  return absoluteUrl(`/reserva/${code}`);
}

export { PaymentConfigError };
