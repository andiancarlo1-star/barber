import type { NotificationType } from "@prisma/client";
import { prisma } from "./prisma";
import { getSettings, type SettingsLike } from "./settings";
import { formatDateLong, formatMoney, formatTime, absoluteUrlSafe } from "./notifications-format";

export type AppointmentForNotification = {
  id: string;
  code: string;
  startAt: Date;
  endAt: Date;
  status: string;
  totalCents: number;
  depositCents: number;
  amountDueCents: number;
  currency: string;
  customer: { name: string; email: string; phone: string };
  barber: { user: { name: string } };
  service: { name: string; durationMin: number };
  payments: Array<{ status: string; amountCents: number; cardBrand: string | null; cardLast4: string | null; authorizationCode: string | null }>;
};

function receiptLine(appointment: AppointmentForNotification): string {
  const payment = appointment.payments.find((p) => p.status === "PAID");
  if (!payment) return "";
  const card = payment.cardBrand ? ` · ${payment.cardBrand} ****${payment.cardLast4 ?? ""}` : "";
  const auth = payment.authorizationCode ? ` · Autorización ${payment.authorizationCode}` : "";
  return `\nPago: ${formatMoney(payment.amountCents, appointment.currency)}${card}${auth}`;
}

export function buildMessage(
  type: NotificationType,
  appointment: AppointmentForNotification,
  settings: SettingsLike,
): { subject: string; body: string } {
  const date = formatDateLong(appointment.startAt);
  const time = formatTime(appointment.startAt);
  const service = appointment.service.name;
  const barber = appointment.barber.user.name;
  const amount = formatMoney(appointment.totalCents, appointment.currency);
  const deposit = formatMoney(appointment.amountDueCents, appointment.currency);
  const link = absoluteUrlSafe(`/reserva/${appointment.code}`);
  const base = `Hola ${appointment.customer.name},\n\n`;

  switch (type) {
    case "BOOKING_CONFIRMED":
      return {
        subject: `Cita confirmada · ${settings.businessName}`,
        body:
          `${base}Tu cita está confirmada.\n\n` +
          `Código: ${appointment.code}\nServicio: ${service}\nBarbero: ${barber}\nFecha: ${date}\nHora: ${time}\nTotal: ${amount}\n` +
          (appointment.amountDueCents > 0 ? `Anticipo pagado: ${deposit}\n` : "") +
          `\nDirección: ${settings.address}\n\nVer o gestionar tu cita: ${link}\n\n` +
          `Política de cancelación: puedes cancelar sin costo hasta ${settings.cancellationHours} horas antes.\n\n${settings.businessName}`,
      };
    case "PAYMENT_CONFIRMED":
      return {
        subject: `Pago recibido · ${settings.businessName}`,
        body:
          `${base}Recibimos tu pago y tu cita quedó confirmada.\n\n` +
          `Código: ${appointment.code}\nServicio: ${service}\nBarbero: ${barber}\nFecha: ${date} a las ${time}\nTotal: ${amount}` +
          receiptLine(appointment) +
          `\n\nComprobante: ${absoluteUrlSafe(`/reserva/${appointment.code}/comprobante`)}\n\n${settings.businessName}`,
      };
    case "PAYMENT_FAILED":
      return {
        subject: `No pudimos procesar tu pago · ${settings.businessName}`,
        body:
          `${base}El pago de tu reserva ${appointment.code} no pudo completarse. El horario queda reservado temporalmente.\n\n` +
          `Puedes reintentar el pago aquí: ${link}\n\nSi el problema persiste, escríbenos por WhatsApp al ${settings.phone}.\n\n${settings.businessName}`,
      };
    case "REMINDER":
      return {
        subject: `Recordatorio de tu cita · ${settings.businessName}`,
        body:
          `${base}Te recordamos tu cita de ${service} con ${barber}.\n\n` +
          `Fecha: ${date}\nHora: ${time}\nDirección: ${settings.address}\nCódigo: ${appointment.code}\n\n` +
          `Si necesitas reprogramar, contáctanos con al menos ${settings.cancellationHours} horas de anticipación.\n\n${settings.businessName}`,
      };
    case "CANCELLED":
      return {
        subject: `Cita cancelada · ${settings.businessName}`,
        body:
          `${base}Tu cita ${appointment.code} del ${date} a las ${time} ha sido cancelada.\n\n` +
          `Si ya realizaste un pago, contáctanos para gestionar el reembolso según nuestra política.\n\n${settings.businessName}`,
      };
    case "RESCHEDULED":
      return {
        subject: `Cita reprogramada · ${settings.businessName}`,
        body:
          `${base}Tu cita fue reprogramada.\n\nNueva fecha: ${date}\nNueva hora: ${time}\nServicio: ${service}\nBarbero: ${barber}\n\n` +
          `Código: ${appointment.code}\nVer detalle: ${link}\n\n${settings.businessName}`,
      };
    default:
      return {
        subject: `Actualización de tu cita · ${settings.businessName}`,
        body: `${base}Tu cita ${appointment.code} tuvo una actualización.\n\nVer detalle: ${link}`,
      };
  }
}

export async function loadAppointmentForNotification(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: true,
      barber: { include: { user: true } },
      service: true,
      payments: true,
    },
  });
}

export async function notifyAppointment(
  appointmentId: string,
  type: NotificationType,
  options: { scheduledFor?: Date; channels?: Array<"EMAIL" | "WHATSAPP"> } = {},
) {
  const appointment = await loadAppointmentForNotification(appointmentId);
  if (!appointment) return [];
  const settings = await getSettings();
  const { subject, body } = buildMessage(type, appointment as unknown as AppointmentForNotification, settings);
  const channels = options.channels ?? ["EMAIL", "WHATSAPP"];
  const created = [];

  for (const channel of channels) {
    const recipient =
      channel === "EMAIL" ? appointment.customer.email : appointment.customer.phone;
    if (!recipient) continue;

    created.push(
      await prisma.notification.create({
        data: {
          appointmentId: appointment.id,
          customerId: appointment.customerId,
          channel,
          type,
          recipient,
          subject: channel === "EMAIL" ? subject : subject,
          body,
          scheduledFor: options.scheduledFor ?? null,
        },
      }),
    );
  }

  await Promise.allSettled(created.map((n) => dispatchNotification(n.id)));
  return created;
}

export async function dispatchNotification(id: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.status === "SENT") return;

  try {
    let providerRef: string | undefined;

    if (notification.channel === "EMAIL") {
      const result = await sendEmail({
        to: notification.recipient,
        subject: notification.subject ?? "Notificación",
        body: notification.body,
      });
      if (result.status === "SKIPPED") {
        await prisma.notification.update({
          where: { id },
          data: { status: "SKIPPED", error: result.reason },
        });
        return;
      }
      providerRef = result.providerRef;
    } else {
      const result = await sendWhatsApp(notification.recipient, notification.body);
      if (result.status === "SKIPPED") {
        await prisma.notification.update({
          where: { id },
          data: { status: "SKIPPED", error: result.reason },
        });
        return;
      }
      providerRef = result.providerRef;
    }

    await prisma.notification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date(), providerRef, error: null },
    });
  } catch (error) {
    await prisma.notification.update({
      where: { id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message.slice(0, 500) : "Error desconocido",
      },
    });
  }
}

type SendResult =
  | { status: "SENT"; providerRef?: string }
  | { status: "SKIPPED"; reason: string };

async function sendEmail(input: { to: string; subject: string; body: string }): Promise<SendResult> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] Para: ${input.to} | ${input.subject}`);
    }
    return { status: "SKIPPED", reason: "SMTP no configurado (modo desarrollo)" };
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Navaja Barber Studio <citas@navajabarber.gt>",
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: bodyToHtml(input.body),
  });

  return { status: "SENT", providerRef: info.messageId };
}

async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!apiUrl || !token || !phoneId) {
    return { status: "SKIPPED", reason: "WhatsApp no configurado (integración preparada)" };
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/[^\d]/g, ""),
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp API respondió ${response.status}`);
  }
  const data = (await response.json()) as { messages?: Array<{ id: string }> };
  return { status: "SENT", providerRef: data.messages?.[0]?.id };
}

function bodyToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const linked = escaped.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" style="color:#a6752e">$1</a>',
  );
  return `<div style="background:#0c0c0d;color:#e7e5e4;font-family:Arial,sans-serif;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#17171a;border:1px solid #33333a;border-radius:12px;padding:32px">
      <div style="color:#cfa64b;letter-spacing:4px;font-size:12px;text-transform:uppercase;margin-bottom:24px">Navaja Barber Studio</div>
      <div style="white-space:pre-wrap;line-height:1.65;font-size:15px">${linked}</div>
    </div>
  </div>`;
}

export async function queueReminders(): Promise<number> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startAt: { gte: in23h, lte: in24h },
      reminderSentAt: null,
    },
    select: { id: true },
  });

  for (const appointment of appointments) {
    await notifyAppointment(appointment.id, "REMINDER", {
      scheduledFor: new Date(now.getTime() + 5 * 60 * 1000),
      channels: ["EMAIL", "WHATSAPP"],
    });
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { reminderSentAt: now },
    });
  }

  return appointments.length;
}

export async function dispatchDueNotifications(): Promise<number> {
  const due = await prisma.notification.findMany({
    where: {
      status: "QUEUED",
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
    },
    select: { id: true },
    take: 50,
  });
  await Promise.allSettled(due.map((n) => dispatchNotification(n.id)));
  return due.length;
}
