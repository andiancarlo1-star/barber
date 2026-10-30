import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAvailabilityRange } from "@/lib/availability";
import { getSettings } from "@/lib/settings";
import { clientIp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(21).optional(),
});

export async function GET(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`availability:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    serviceId: url.searchParams.get("serviceId"),
    barberId: url.searchParams.get("barberId"),
    from: url.searchParams.get("from") ?? undefined,
    days: url.searchParams.get("days") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const [service, barber, settings] = await Promise.all([
    prisma.service.findFirst({ where: { id: parsed.data.serviceId, active: true } }),
    prisma.barber.findFirst({
      where: { id: parsed.data.barberId, active: true, acceptsBookings: true },
    }),
    getSettings(),
  ]);

  if (!service) return NextResponse.json({ error: "Servicio no disponible" }, { status: 404 });
  if (!barber) return NextResponse.json({ error: "Barbero no disponible" }, { status: 404 });

  const days = await getAvailabilityRange({
    service,
    barberId: barber.id,
    fromKey: parsed.data.from,
    days: parsed.data.days ?? 21,
    settings,
  });

  return NextResponse.json(
    {
      days,
      timezone: settings.timezone,
      service: {
        id: service.id,
        name: service.name,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
      },
      settings: {
        minAdvanceMinutes: settings.minAdvanceMinutes,
        maxAdvanceDays: settings.maxAdvanceDays,
        slotIntervalMin: settings.slotIntervalMin,
        depositType: settings.depositType,
        depositValue: settings.depositValue,
        requirePayment: settings.requirePayment,
        currency: settings.currency,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
