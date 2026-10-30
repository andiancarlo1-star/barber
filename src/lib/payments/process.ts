import type { PaymentProvider } from "@prisma/client";
import { prisma } from "../prisma";
import { logAudit } from "../audit";
import { notifyAppointment } from "../notifications";
import type { ParsedWebhook } from "./types";

export type ProcessResult = {
  ok: boolean;
  message: string;
  ignored?: boolean;
};

export async function processPaymentUpdate(
  parsed: ParsedWebhook,
  provider: PaymentProvider,
): Promise<ProcessResult> {
  const payment = await prisma.payment.findUnique({
    where: { externalId: parsed.externalId },
    include: { appointment: true },
  });

  if (!payment) {
    await logAudit({
      action: "PAYMENT_WEBHOOK_UNKNOWN",
      entity: "Payment",
      entityId: parsed.externalId,
      metadata: { provider, status: parsed.status, rawStatus: parsed.rawStatus },
    });
    return { ok: false, message: "Pago no encontrado", ignored: true };
  }

  if (payment.provider !== provider) {
    return { ok: false, message: "Proveedor no coincide", ignored: true };
  }

  if (parsed.amountCents !== undefined && parsed.amountCents !== payment.amountCents) {
    await logAudit({
      action: "PAYMENT_AMOUNT_MISMATCH",
      entity: "Payment",
      entityId: payment.id,
      metadata: {
        expected: payment.amountCents,
        received: parsed.amountCents,
        provider,
        eventId: parsed.eventId,
      },
    });
    return { ok: false, message: "Monto no coincide", ignored: true };
  }

  try {
    await prisma.paymentEvent.create({
      data: {
        provider,
        eventId: parsed.eventId,
        paymentId: payment.id,
        payload: parsed.raw as never,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: true, message: "Evento ya procesado", ignored: true };
    }
    throw error;
  }

  if (parsed.status === "PENDING") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PROCESSING",
          rawStatus: parsed.rawStatus,
          providerRef: parsed.providerRef ?? payment.providerRef,
        },
      }),
      prisma.paymentEvent.updateMany({
        where: { eventId: parsed.eventId, provider },
        data: { processedAt: new Date() },
      }),
    ]);
    return { ok: true, message: "Pago en proceso" };
  }

  let shouldNotifyPaid = false;
  let shouldNotifyFailed = false;

  await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({
      where: { id: payment.id },
      include: { appointment: true },
    });
    if (!current) return;

    if (parsed.status === "PAID") {
      if (current.status !== "PAID") {
        shouldNotifyPaid = true;
        await tx.payment.update({
          where: { id: current.id },
          data: {
            status: "PAID",
            paidAt: new Date(),
            cardBrand: parsed.cardBrand ?? current.cardBrand,
            cardLast4: parsed.cardLast4 ?? current.cardLast4,
            authorizationCode: parsed.authorizationCode ?? current.authorizationCode,
            providerRef: parsed.providerRef ?? current.providerRef,
            rawStatus: parsed.rawStatus ?? "PAID",
            failureReason: null,
            receiptUrl: `/reserva/${current.appointment.code}/comprobante`,
          },
        });

        if (current.appointment.status === "PENDING_PAYMENT") {
          await tx.appointment.update({
            where: { id: current.appointmentId },
            data: { status: "CONFIRMED" },
          });
        }
      }
    } else if (parsed.status === "FAILED") {
      if (current.status !== "FAILED" && current.status !== "PAID") {
        shouldNotifyFailed = true;
        await tx.payment.update({
          where: { id: current.id },
          data: {
            status: "FAILED",
            rawStatus: parsed.rawStatus,
            failureReason: parsed.failureReason ?? "Pago rechazado por la pasarela",
            providerRef: parsed.providerRef ?? current.providerRef,
          },
        });
      }
    } else if (parsed.status === "REFUNDED") {
      await tx.payment.update({
        where: { id: current.id },
        data: { status: "REFUNDED", rawStatus: parsed.rawStatus ?? "REFUNDED" },
      });
    }

    await tx.paymentEvent.updateMany({
      where: { eventId: parsed.eventId, provider },
      data: { processedAt: new Date() },
    });
  });

  await logAudit({
    action: `PAYMENT_${parsed.status}`,
    entity: "Payment",
    entityId: payment.id,
    metadata: {
      provider,
      eventId: parsed.eventId,
      rawStatus: parsed.rawStatus,
      amountCents: parsed.amountCents,
    },
  });

  if (shouldNotifyPaid) {
    await notifyAppointment(payment.appointmentId, "PAYMENT_CONFIRMED");
  }
  if (shouldNotifyFailed) {
    await notifyAppointment(payment.appointmentId, "PAYMENT_FAILED");
  }

  return { ok: true, message: `Pago actualizado a ${parsed.status}` };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
