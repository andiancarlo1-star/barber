import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateLong, formatDateTime, formatTime } from "@/lib/dates";
import { PageHeader } from "@/components/admin/page-header";
import { BarberForm } from "@/components/admin/barber-form";
import { BarberScheduleForm } from "@/components/admin/barber-schedule-form";
import { TimeOffForm } from "@/components/admin/time-off-form";
import { Badge, StatusBadge, buttonClasses } from "@/components/ui";
import { deleteTimeOffAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditBarberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const barber = await prisma.barber.findUnique({
    where: { id },
    include: {
      user: true,
      schedules: { orderBy: { weekday: "asc" } },
      availability: { where: { endAt: { gte: new Date() } }, orderBy: { startAt: "asc" }, take: 20 },
      appointments: {
        where: { startAt: { gte: new Date() }, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
        include: { customer: true, service: true },
        orderBy: { startAt: "asc" },
        take: 6,
      },
    },
  });
  if (!barber) notFound();

  const redirectTo = `/admin/barberos/${barber.id}`;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/admin/barberos"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-gold-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a barberos
      </Link>
      <PageHeader
        title={barber.user.name}
        description={`${barber.title ?? "Barbero"} · ${barber.user.email}`}
        action={<Badge tone={barber.active ? "green" : "neutral"}>{barber.active ? "Activo" : "Inactivo"}</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <BarberForm
            barber={{
              id: barber.id,
              name: barber.user.name,
              email: barber.user.email,
              phone: barber.user.phone ?? "",
              title: barber.title ?? "",
              bio: barber.bio ?? "",
              imageUrl: barber.imageUrl ?? "",
              displayOrder: barber.displayOrder,
              active: barber.active,
              acceptsBookings: barber.acceptsBookings,
            }}
          />
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <Clock className="h-4 w-4 text-gold-500" />
              Horario semanal
            </h3>
            <div className="mt-3">
              <BarberScheduleForm
                barberId={barber.id}
                redirectTo={redirectTo}
                schedules={barber.schedules.map((schedule) => ({
                  weekday: schedule.weekday,
                  startMinute: schedule.startMinute,
                  endMinute: schedule.endMinute,
                }))}
              />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="text-sm font-semibold text-stone-200">Bloqueos y vacaciones</h3>
            {barber.availability.length === 0 ? (
              <p className="mt-2 text-[10px] text-stone-600">Sin bloqueos futuros.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {barber.availability.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10px] text-stone-300">
                        {block.type === "VACATION" ? "Vacaciones" : block.type === "DAY_OFF" ? "Día libre" : "Bloqueo"}
                        {block.reason ? ` · ${block.reason}` : ""}
                      </p>
                      <p className="text-[9px] text-stone-600">
                        {formatDateLong(block.startAt)} → {formatDateLong(new Date(block.endAt.getTime() - 1))}
                      </p>
                    </div>
                    <form action={deleteTimeOffAction}>
                      <input type="hidden" name="id" value={block.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button
                        type="submit"
                        className="rounded p-1 text-stone-600 hover:bg-red-500/10 hover:text-red-300"
                        title="Eliminar bloqueo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 border-t border-white/5 pt-4">
              <TimeOffForm barbers={[{ id: barber.id, name: barber.user.name }]} defaultBarberId={barber.id} redirectTo={redirectTo} lockBarber />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <CalendarDays className="h-4 w-4 text-gold-500" />
              Próximas citas
            </h3>
            {barber.appointments.length === 0 ? (
              <p className="mt-2 text-[10px] text-stone-600">Sin citas próximas.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {barber.appointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/admin/citas/${appointment.id}`}
                    className="block rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 hover:border-gold-500/20"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[10px] font-medium text-stone-300">
                        {appointment.customer.name}
                      </p>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <p className="mt-0.5 text-[9px] text-stone-600">
                      {formatDateTime(appointment.startAt)} · {formatTime(appointment.endAt)}
                    </p>
                    <p className="truncate text-[9px] text-stone-600">{appointment.service.name}</p>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/admin/citas"
              className={buttonClasses({ variant: "ghost", size: "sm", className: "mt-3 w-full" })}
            >
              Ver agenda
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
