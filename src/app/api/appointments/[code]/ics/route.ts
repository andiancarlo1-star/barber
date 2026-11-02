import { prisma } from "@/lib/prisma";
import { formatDateLong } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { setRlsContext } from "@/lib/rls";
import { clientIp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const limit = rateLimit(`appointment-ics:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) return new Response("Demasiadas solicitudes", { status: 429 });
  setRlsContext({ role: "SYSTEM" });
  const { code } = await params;
  const [appointment, settings] = await Promise.all([
    prisma.appointment.findUnique({
      where: { code },
      include: { service: true, barber: { include: { user: true } }, customer: true },
    }),
    getSettings(),
  ]);

  if (!appointment) {
    return new Response("Reserva no encontrada", { status: 404 });
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Navaja Barber Studio//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.code}@navajabarber.gt`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(appointment.startAt)}`,
    `DTEND:${icsDate(appointment.endAt)}`,
    `SUMMARY:${escape(`${appointment.service.name} · ${settings.businessName}`)}`,
    `DESCRIPTION:${escape(
      `Código ${appointment.code}\nBarbero: ${appointment.barber.user.name}\nTotal: Q${(appointment.totalCents / 100).toFixed(2)}\n${formatDateLong(appointment.startAt)}`,
    )}`,
    `LOCATION:${escape(settings.address)}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape("Tu cita en Navaja Barber Studio")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cita-${appointment.code}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
