import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createCheckoutForAppointment, PaymentConfigError } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { setRlsContext } from "@/lib/rls";
import { clientIp, isSameOrigin } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().min(4).max(64) });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const limit = rateLimit(`checkout:${clientIp(request)}`, 20, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });

  setRlsContext({ role: "SYSTEM" });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

  const appointment = await prisma.appointment.findUnique({
    where: { code: parsed.data.code },
    select: { id: true, status: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  if (appointment.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "La reserva no está pendiente de pago", status: appointment.status },
      { status: 409 },
    );
  }

  try {
    const settings = await getSettings();
    const checkout = await createCheckoutForAppointment(appointment.id, settings);
    return NextResponse.json({ ok: true, checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    if (error instanceof PaymentConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  }
}
