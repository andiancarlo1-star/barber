import { prisma } from "@/lib/prisma";
import { formatMoney, todayKey } from "@/lib/dates";
import { PageHeader } from "@/components/admin/page-header";
import { ManualAppointmentForm } from "@/components/admin/manual-appointment-form";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage() {
  const [services, barbers] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.barber.findMany({
      where: { active: true, acceptsBookings: true },
      include: { user: true, schedules: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Nueva cita manual"
        description="Registra una reserva tomada por teléfono, WhatsApp o en recepción."
      />
      <ManualAppointmentForm
        today={todayKey()}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          meta: `${formatMoney(service.priceCents)} · ${service.durationMin} min`,
        }))}
        barbers={barbers.map((barber) => ({
          id: barber.id,
          name: barber.user.name,
          meta: `${barber.schedules.length} día${barber.schedules.length === 1 ? "" : "s"} de trabajo`,
        }))}
      />
    </div>
  );
}
