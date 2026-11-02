import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cancelAppointment, BookingError } from "@/lib/appointments";
import { getSessionUser } from "@/lib/auth-helpers";
import { setRlsContext } from "@/lib/rls";
import { clientIp, isSameOrigin } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(4).max(64),
  reason: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const limit = rateLimit(`cancel:${clientIp(request)}`, 10, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });

  setRlsContext({ role: "SYSTEM" });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const appointment = await prisma.appointment.findUnique({
    where: { code: parsed.data.code },
    include: { customer: true },
  });
  if (!appointment) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  const user = await getSessionUser();
  setRlsContext({ role: "SYSTEM" });
  const isAdmin = user?.role === "ADMIN";
  const isOwner =
    user?.role === "CUSTOMER" &&
    (user.customerId === appointment.customerId ||
      user.email.toLowerCase() === appointment.customer.email.toLowerCase());

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "Inicia sesión con el correo de la reserva para cancelar." },
      { status: 403 },
    );
  }

  try {
    await cancelAppointment({
      appointmentId: appointment.id,
      reason: parsed.data.reason || "Cancelada por el cliente",
      actorId: user?.id ?? null,
      actorRole: isAdmin ? "ADMIN" : "CUSTOMER",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "No se pudo cancelar la reserva" }, { status: 500 });
  }
}
