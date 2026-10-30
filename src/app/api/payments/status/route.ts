import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const externalId = url.searchParams.get("externalId");
  const code = url.searchParams.get("code");

  if (!externalId && !code) {
    return NextResponse.json({ error: "Falta referencia" }, { status: 400 });
  }

  const payment = externalId
    ? await prisma.payment.findUnique({
        where: { externalId },
        include: { appointment: { select: { code: true, status: true } } },
      })
    : await prisma.payment.findFirst({
        where: { appointment: { code: code! } },
        orderBy: { createdAt: "desc" },
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
