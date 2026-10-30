import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  addDaysToKey,
  calendarDays,
  dateKeyInTZ,
  formatDateKeyLong,
  formatDateKeyShort,
  formatTime,
  startOfWeekKey,
  todayKey,
  weekdayOfKey,
  zonedToUtc,
} from "@/lib/dates";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string }>;
}) {
  const params = await searchParams;
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? "") ? params.fecha! : todayKey();
  const view = params.vista === "semana" ? "semana" : "dia";
  const weekStart = startOfWeekKey(dateKey);
  const days = view === "semana" ? calendarDays(weekStart, 7) : [dateKey];
  const rangeStart = zonedToUtc(days[0], 0);
  const rangeEnd = zonedToUtc(addDaysToKey(days[days.length - 1], 1), 0);

  const [barbers, appointments, schedules] = await Promise.all([
    prisma.barber.findMany({
      where: { active: true },
      include: { user: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        startAt: { gte: rangeStart, lt: rangeEnd },
        status: { not: "CANCELLED" },
      },
      include: { customer: true, service: true, barber: { include: { user: true } }, payments: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.schedule.findMany(),
  ]);

  const prev =
    view === "semana" ? addDaysToKey(weekStart, -7) : addDaysToKey(dateKey, -1);
  const next =
    view === "semana" ? addDaysToKey(weekStart, 7) : addDaysToKey(dateKey, 1);
  const base = (key: string, v = view) => `/admin/calendario?fecha=${key}&vista=${v}`;

  const dayAppointments = appointments.filter(
    (appointment) => dateKeyInTZ(appointment.startAt) === dateKey,
  );

  return (
    <div>
      <PageHeader
        title="Calendario"
        description={
          view === "dia"
            ? formatDateKeyLong(dateKey)
            : `${formatDateKeyShort(weekStart)} – ${formatDateKeyShort(addDaysToKey(weekStart, 6))}`
        }
        action={{
          href: `/admin/citas/nueva`,
          label: "Nueva cita",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={base(prev)} className={buttonClasses({ variant: "dark", size: "sm" })}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href={base(todayKey())} className={buttonClasses({ variant: "outline", size: "sm" })}>
            Hoy
          </Link>
          <Link href={base(next)} className={buttonClasses({ variant: "dark", size: "sm" })}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-ink-900 p-1">
          <Link
            href={base(dateKey, "dia")}
            className={cn(
              "rounded-md px-3 py-1.5 text-[11px] transition",
              view === "dia" ? "bg-gold-500/15 text-gold-200" : "text-stone-500 hover:text-stone-300",
            )}
          >
            Día
          </Link>
          <Link
            href={base(dateKey, "semana")}
            className={cn(
              "rounded-md px-3 py-1.5 text-[11px] transition",
              view === "semana" ? "bg-gold-500/15 text-gold-200" : "text-stone-500 hover:text-stone-300",
            )}
          >
            Semana
          </Link>
        </div>
      </div>

      {view === "dia" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {barbers.map((barber) => {
            const items = dayAppointments.filter((appointment) => appointment.barberId === barber.id);
            return (
              <section key={barber.id} className="rounded-xl border border-white/10 bg-ink-850/60">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-gradient text-[10px] font-bold text-ink-950">
                      {barber.user.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-stone-200">{barber.user.name}</p>
                      <p className="text-[9px] text-stone-600">{barber.title ?? "Barbero"}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-stone-500">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  {items.length === 0 ? (
                    <p className="py-8 text-center text-[10px] text-stone-600">Sin citas</p>
                  ) : (
                    items.map((appointment) => {
                      const paid = appointment.payments.some((payment) => payment.status === "PAID");
                      return (
                        <Link
                          key={appointment.id}
                          href={`/admin/citas/${appointment.id}`}
                          className="block rounded-lg border border-white/10 bg-ink-900/70 p-3 transition hover:border-gold-500/30"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gold-300">
                              <Clock className="h-3 w-3" />
                              {formatTime(appointment.startAt)}
                            </span>
                            <StatusBadge status={appointment.status} />
                          </div>
                          <p className="mt-1.5 truncate text-xs font-medium text-stone-200">
                            {appointment.customer.name}
                          </p>
                          <p className="truncate text-[10px] text-stone-500">{appointment.service.name}</p>
                          <p className="mt-1 text-[9px] text-stone-600">
                            {appointment.service.durationMin} min ·{" "}
                            <span className={paid ? "text-emerald-400" : "text-amber-400"}>
                              {paid ? "pagado" : "sin pago"}
                            </span>
                          </p>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map((dayKey) => {
            const items = appointments.filter(
              (appointment) => dateKeyInTZ(appointment.startAt) === dayKey,
            );
            const schedule = schedules.find((row) => row.weekday === weekdayOfKey(dayKey));
            const closed = !schedule?.active;
            const isToday = dayKey === todayKey();
            return (
              <section
                key={dayKey}
                className={cn(
                  "rounded-xl border bg-ink-850/60",
                  isToday ? "border-gold-500/40" : "border-white/10",
                )}
              >
                <Link
                  href={base(dayKey, "dia")}
                  className="block border-b border-white/5 px-3 py-2.5 hover:bg-white/[0.03]"
                >
                  <p className="text-[9px] uppercase tracking-wide text-stone-600">
                    {formatDateKeyShort(dayKey).split(" ")[0]}
                  </p>
                  <p className={cn("text-sm font-semibold", isToday ? "text-gold-300" : "text-stone-200")}>
                    {formatDateKeyShort(dayKey).split(" ").slice(0, 2).join(" ")}
                  </p>
                  <p className="mt-0.5 text-[9px] text-stone-600">
                    {closed ? "Cerrado" : `${items.length} cita${items.length === 1 ? "" : "s"}`}
                  </p>
                </Link>
                <div className="space-y-1.5 p-2">
                  {items.slice(0, 6).map((appointment) => (
                    <Link
                      key={appointment.id}
                      href={`/admin/citas/${appointment.id}`}
                      className="block rounded-md border border-white/5 bg-ink-900/70 px-2 py-1.5 hover:border-gold-500/30"
                    >
                      <p className="text-[9px] font-medium text-gold-300">
                        {formatTime(appointment.startAt)}
                      </p>
                      <p className="truncate text-[10px] text-stone-300">{appointment.customer.name}</p>
                      <p className="truncate text-[8px] text-stone-600">{appointment.service.name}</p>
                    </Link>
                  ))}
                  {items.length > 6 ? (
                    <Link
                      href={base(dayKey, "dia")}
                      className="block py-1 text-center text-[9px] text-gold-400 hover:text-gold-300"
                    >
                      +{items.length - 6} más
                    </Link>
                  ) : null}
                  {items.length === 0 && !closed ? (
                    <p className="py-4 text-center text-[9px] text-stone-700">Libre</p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex items-center gap-4 text-[10px] text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" /> {appointments.length} citas en el rango
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Pagado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Sin pago
        </span>
      </div>
    </div>
  );
}
