import Link from "next/link";
import { CalendarOff, Clock, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireBarber } from "@/lib/auth-helpers";
import { formatDateLong, minutesToTimeLabel } from "@/lib/dates";
import { WEEKDAYS_ES } from "@/lib/constants";
import { PageHeader } from "@/components/admin/page-header";
import { BarberScheduleForm } from "@/components/admin/barber-schedule-form";
import { TimeOffForm } from "@/components/admin/time-off-form";
import { Alert, buttonClasses } from "@/components/ui";
import { deleteTimeOffAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function BarberAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { user, barberId } = await requireBarber();
  const params = await searchParams;

  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: {
      schedules: { orderBy: { weekday: "asc" } },
      availability: { where: { endAt: { gte: new Date() } }, orderBy: { startAt: "asc" } },
    },
  });
  if (!barber) return null;

  const redirectTo = "/barbero/disponibilidad";

  return (
    <div>
      <PageHeader
        title="Mi disponibilidad"
        description="Define tus días de trabajo y registra ausencias."
        action={{ href: "/barbero/agenda", label: "Ver agenda", icon: <Clock className="h-4 w-4" /> }}
      />

      {params.ok ? <Alert tone="success" className="mb-4">Disponibilidad actualizada.</Alert> : null}
      {params.error ? <Alert tone="error" className="mb-4">{params.error}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
            <Clock className="h-4 w-4 text-gold-500" />
            Horario semanal
          </h3>
          <p className="mt-0.5 text-[10px] text-stone-600">
            Tu horario se recorta automáticamente al horario del negocio y respeta el descanso.
          </p>
          <div className="mt-4">
            <BarberScheduleForm
              barberId={barberId}
              redirectTo={redirectTo}
              schedules={barber.schedules.map((schedule) => ({
                weekday: schedule.weekday,
                startMinute: schedule.startMinute,
                endMinute: schedule.endMinute,
              }))}
            />
          </div>

          <div className="mt-5 border-t border-white/5 pt-4">
            <h4 className="text-[11px] font-semibold text-stone-300">Resumen</h4>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {WEEKDAYS_ES.map((label, weekday) => {
                const schedule = barber.schedules.find((item) => item.weekday === weekday);
                return (
                  <div key={weekday} className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
                    <p className="text-[8px] uppercase text-stone-600">{label}</p>
                    <p className={`text-[9px] ${schedule ? "text-stone-300" : "text-stone-700"}`}>
                      {schedule
                        ? `${minutesToTimeLabel(schedule.startMinute)} – ${minutesToTimeLabel(schedule.endMinute)}`
                        : "Libre"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
            <CalendarOff className="h-4 w-4 text-gold-500" />
            Registrar ausencia
          </h3>
          <p className="mt-0.5 text-[10px] text-stone-600">
            Los bloqueos se descuentan de la disponibilidad pública de inmediato.
          </p>
          <div className="mt-4">
            <TimeOffForm
              barbers={[{ id: barberId, name: user.name }]}
              defaultBarberId={barberId}
              redirectTo={redirectTo}
              lockBarber
            />
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-white/10 bg-ink-850/60">
        <div className="border-b border-white/5 px-5 py-4">
          <h3 className="text-sm font-semibold text-stone-200">Mis bloqueos próximos</h3>
        </div>
        {barber.availability.length === 0 ? (
          <p className="px-5 py-8 text-center text-[11px] text-stone-600">
            No tienes bloqueos futuros. Tu agenda está abierta según tu horario.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {barber.availability.map((block) => (
              <div key={block.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
                  <CalendarOff className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-stone-200">
                    {block.type === "VACATION" ? "Vacaciones" : block.type === "DAY_OFF" ? "Día libre" : "Bloqueo"}
                  </p>
                  <p className="text-[9px] text-stone-500">
                    {formatDateLong(block.startAt)} → {formatDateLong(new Date(block.endAt.getTime() - 1))}
                    {block.reason ? ` · ${block.reason}` : ""}
                  </p>
                </div>
                <form action={deleteTimeOffAction}>
                  <input type="hidden" name="id" value={block.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
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
          <Link href="/barbero/agenda" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Ir a mi agenda
          </Link>
        </div>
      </section>
    </div>
  );
}
