import type { Metadata } from "next";
import { CalendarCheck, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth-helpers";
import { todayKey } from "@/lib/dates";
import { BookingWizard } from "@/components/booking/booking-wizard";

export const metadata: Metadata = {
  title: "Reservar cita",
  description: "Elige servicio, barbero, fecha y hora. Confirma con pago seguro.",
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; barber?: string }>;
}) {
  const params = await searchParams;
  const [settings, services, barbers, sessionUser] = await Promise.all([
    getSettings(),
    prisma.service.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        priceCents: true,
        durationMin: true,
        imageUrl: true,
        category: true,
      },
    }),
    prisma.barber.findMany({
      where: { active: true, acceptsBookings: true },
      include: { user: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    getSessionUser(),
  ]);

  let prefill = { name: "", email: "", phone: "" };
  if (sessionUser) {
    prefill = {
      name: sessionUser.name,
      email: sessionUser.email,
      phone: sessionUser.phone ?? "",
    };
    if (sessionUser.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: sessionUser.customerId },
        select: { name: true, email: true, phone: true },
      });
      if (customer) prefill = customer;
    }
  }

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-72 bg-radial-gold" />
      <div className="container-px relative py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Reserva en línea</p>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl">
                Tu próxima cita, <span className="gold-text italic">en cuatro pasos.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-stone-400">
                Elige tu servicio y barbero, selecciona el horario que mejor te funcione y confirma con
                un anticipo seguro.
              </p>
            </div>
            <div className="flex gap-4 text-[11px] text-stone-500">
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-gold-500" />
                Confirmación inmediata
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-gold-500" />
                Pago protegido
              </span>
            </div>
          </div>

          <div className="mt-10">
            <BookingWizard
              services={services}
              barbers={barbers.map((barber) => ({
                id: barber.id,
                slug: barber.slug,
                name: barber.user.name,
                title: barber.title,
                bio: barber.bio,
                imageUrl: barber.imageUrl,
              }))}
              prefill={prefill}
              isLoggedIn={Boolean(sessionUser)}
              initialServiceSlug={params.service}
              initialBarberSlug={params.barber}
              today={todayKey()}
              settings={{
                requirePayment: settings.requirePayment,
                depositType: settings.depositType,
                depositValue: settings.depositValue,
                minAdvanceMinutes: settings.minAdvanceMinutes,
                cancellationHours: settings.cancellationHours,
                businessName: settings.businessName,
                currency: settings.currency,
                paymentProvider: settings.paymentProvider,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
