import Link from "next/link";
import { CalendarDays, Plus, Scissors, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { WEEKDAYS_SHORT_ES } from "@/lib/constants";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Badge, EmptyState, buttonClasses } from "@/components/ui";
import { toggleBarberAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function BarbersPage() {
  const barbers = await prisma.barber.findMany({
    include: {
      user: true,
      schedules: { orderBy: { weekday: "asc" } },
      _count: { select: { appointments: true } },
    },
    orderBy: { displayOrder: "asc" },
  });

  const active = barbers.filter((barber) => barber.active && barber.acceptsBookings);
  const upcoming = await prisma.appointment.count({
    where: {
      startAt: { gte: new Date() },
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
    },
  });

  return (
    <div>
      <PageHeader
        title="Barberos"
        description="Equipo, accesos y disponibilidad semanal."
        action={{ href: "/admin/barberos/nuevo", label: "Nuevo barbero", icon: <Plus className="h-4 w-4" /> }}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Barberos activos" value={String(active.length)} hint={`${barbers.length} en total`} tone="gold" />
        <StatCard label="Aceptan reservas" value={String(active.length)} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="Citas próximas" value={String(upcoming)} tone="green" />
      </div>

      {barbers.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={<Scissors className="h-8 w-8" />}
            title="Sin barberos"
            description="Crea el primer perfil de barbero para habilitar reservas."
            action={
              <Link href="/admin/barberos/nuevo" className={buttonClasses({ variant: "gold", size: "sm" })}>
                Nuevo barbero
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {barbers.map((barber) => {
            const days = new Set(barber.schedules.map((schedule) => schedule.weekday));
            return (
              <div key={barber.id} className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient font-display text-base font-bold text-ink-950">
                      {barber.user.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-stone-200">{barber.user.name}</p>
                      <p className="text-[10px] text-stone-500">{barber.title ?? "Barbero"}</p>
                    </div>
                  </div>
                  <Badge tone={barber.active ? "green" : "neutral"}>
                    {barber.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-2 text-[10px] leading-relaxed text-stone-500">
                  {barber.bio ?? "Sin biografía."}
                </p>

                <div className="mt-3 flex flex-wrap gap-1">
                  {WEEKDAYS_SHORT_ES.map((label, weekday) => (
                    <span
                      key={label}
                      className={`rounded px-1.5 py-0.5 text-[8px] uppercase ${
                        days.has(weekday)
                          ? "bg-gold-500/10 text-gold-300"
                          : "bg-white/[0.03] text-stone-700"
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-stone-600">
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="h-3 w-3" />
                    {barber._count.appointments} citas
                  </span>
                  <span>{barber.acceptsBookings ? "Reservas abiertas" : "Reservas cerradas"}</span>
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/barberos/${barber.id}`}
                    className={buttonClasses({ variant: "dark", size: "sm", className: "flex-1" })}
                  >
                    Editar
                  </Link>
                  <form action={toggleBarberAction}>
                    <input type="hidden" name="id" value={barber.id} />
                    <button
                      type="submit"
                      className={`rounded-lg border px-2.5 py-1.5 text-[10px] transition ${
                        barber.active
                          ? "border-red-500/20 text-red-300 hover:bg-red-500/10"
                          : "border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10"
                      }`}
                    >
                      {barber.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
