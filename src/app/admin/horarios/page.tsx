import Link from "next/link";
import { CalendarOff, Clock, Scissors, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateLong, minutesToTimeLabel } from "@/lib/dates";
import { WEEKDAYS_ES, WEEKDAYS_SHORT_ES } from "@/lib/constants";
import { PageHeader } from "@/components/admin/page-header";
import { BusinessScheduleForm } from "@/components/admin/business-schedule-form";
import { TimeOffForm } from "@/components/admin/time-off-form";
import { Badge, buttonClasses } from "@/components/ui";
import { deleteTimeOffAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const [schedules, barbers, blocks] = await Promise.all([
    prisma.schedule.findMany({ orderBy: { weekday: "asc" } }),
    prisma.barber.findMany({
      include: { user: true, schedules: { orderBy: { weekday: "asc" } } },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.availability.findMany({
      where: { endAt: { gte: new Date() } },
      include: { barber: { include: { user: true } }, createdBy: { select: { name: true } } },
      orderBy: { startAt: "asc" },
      take: 40,
    }),
  ]);

  const openDays = schedules.filter((schedule) => schedule.active);

  return (
    <div>
      <PageHeader
        title="Horarios y bloqueos"
        description="Define la operación del negocio, los turnos del equipo y las ausencias."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
                <Clock className="h-4 w-4 text-gold-500" />
                Horario del negocio
              </h3>
              <p className="mt-0.5 text-[10px] text-stone-600">
                {openDays.length} día{openDays.length === 1 ? "" : "s"} abierto{openDays.length === 1 ? "" : "s"} · hora de Guatemala
              </p>
            </div>
            <Badge tone="gold">America/Guatemala</Badge>
          </div>
          <BusinessScheduleForm
            schedules={schedules.map((schedule) => ({
              weekday: schedule.weekday,
              openMinute: schedule.openMinute,
              closeMinute: schedule.closeMinute,
              breakStartMinute: schedule.breakStartMinute,
              breakEndMinute: schedule.breakEndMinute,
              active: schedule.active,
            }))}
          />
        </section>

        <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
            <CalendarOff className="h-4 w-4 text-gold-500" />
            Nuevo bloqueo
          </h3>
          <p className="mt-0.5 text-[10px] text-stone-600">
            Días libres, vacaciones o cierres. Se descuentan de la disponibilidad pública.
          </p>
          <div className="mt-4">
            <TimeOffForm
              barbers={barbers.map((barber) => ({ id: barber.id, name: barber.user.name }))}
              redirectTo="/admin/horarios"
            />
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-white/10 bg-ink-850/60">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
            <Scissors className="h-4 w-4 text-gold-500" />
            Turnos por barbero
          </h3>
          <Link href="/admin/barberos" className="text-[10px] text-gold-400 hover:text-gold-300">
            Gestionar barberos
          </Link>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {barbers.map((barber) => {
            const days = new Map(barber.schedules.map((schedule) => [schedule.weekday, schedule]));
            return (
              <div key={barber.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-stone-200">{barber.user.name}</p>
                  <Link
                    href={`/admin/barberos/${barber.id}`}
                    className="text-[9px] text-gold-400 hover:text-gold-300"
                  >
                    Editar
                  </Link>
                </div>
                <div className="mt-2 space-y-1">
                  {WEEKDAYS_ES.map((label, weekday) => {
                    const schedule = days.get(weekday);
                    return (
                      <div key={weekday} className="flex items-center justify-between text-[9px]">
                        <span className={schedule ? "text-stone-400" : "text-stone-700"}>
                          {WEEKDAYS_SHORT_ES[weekday]}
                        </span>
                        <span className={schedule ? "text-stone-300" : "text-stone-700"}>
                          {schedule
                            ? `${minutesToTimeLabel(schedule.startMinute)} – ${minutesToTimeLabel(schedule.endMinute)}`
                            : "Libre"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-white/10 bg-ink-850/60">
        <div className="border-b border-white/5 px-5 py-4">
          <h3 className="text-sm font-semibold text-stone-200">Bloqueos próximos</h3>
          <p className="mt-0.5 text-[10px] text-stone-600">{blocks.length} registrados</p>
        </div>
        {blocks.length === 0 ? (
          <p className="px-5 py-8 text-center text-[11px] text-stone-600">
            No hay bloqueos futuros. La agenda está abierta según los horarios.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {blocks.map((block) => (
              <div key={block.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
                  <CalendarOff className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-stone-200">
                    {block.barber?.user.name ?? "Todo el equipo"} ·{" "}
                    {block.type === "VACATION" ? "Vacaciones" : block.type === "DAY_OFF" ? "Día libre" : "Bloqueo"}
                  </p>
                  <p className="text-[9px] text-stone-500">
                    {formatDateLong(block.startAt)} → {formatDateLong(new Date(block.endAt.getTime() - 1))}
                    {block.reason ? ` · ${block.reason}` : ""}
                  </p>
                </div>
                <span className="hidden text-[9px] text-stone-600 sm:block">
                  {block.createdBy?.name ?? "Sistema"}
                </span>
                <form action={deleteTimeOffAction}>
                  <input type="hidden" name="id" value={block.id} />
                  <input type="hidden" name="redirectTo" value="/admin/horarios" />
                  <button
                    type="submit"
                    className="rounded p-1.5 text-stone-600 hover:bg-red-500/10 hover:text-red-300"
                    title="Eliminar bloqueo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-white/5 px-5 py-3">
          <Link href="/admin/calendario" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Ver calendario
          </Link>
        </div>
      </section>
    </div>
  );
}
