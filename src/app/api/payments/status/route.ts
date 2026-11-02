import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setRlsContext } from "@/lib/rls";
import { clientIp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = rateLimit(`payment-status:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Demasiadas consultas" }, { status: 429 });
  }

  setRlsContext({ role: "SYSTEM" });
  const url = new URL(request.url);
  const externalId = url.searchParams.get("externalId");

  if (!externalId || externalId.length > 100) {
    return NextResponse.json({ error: "Falta referencia" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { externalId },
    include: { appointment: { select: { code: true, status: true } } },
  });

  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  return NextResponse.json(
    {
      status: payment.status,
      appointmentStatus: payment.appointment.status,
      code: payment.appointment.code,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
