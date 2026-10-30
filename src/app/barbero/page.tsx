import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Scissors,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireBarber } from "@/lib/auth-helpers";
import {
  addDaysToKey,
  formatDateShort,
  formatMoney,
  formatTime,
  todayKey,
  zonedToUtc,
} from "@/lib/dates";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { EmptyState, StatusBadge, buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BarberDashboardPage() {
  const { user, barberId } = await requireBarber();
  const key = todayKey();
  const startToday = zonedToUtc(key, 0);
  const endToday = zonedToUtc(addDaysToKey(key, 1), 0);
  const startMonth = zonedToUtc(`${key.slice(0, 7)}-01`, 0);

  const [today, upcoming, monthAppointments, monthPayments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId,
        startAt: { gte: startToday, lt: endToday },
        status: { not: "CANCELLED" },
      },
      include: { customer: true, service: true, payments: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        barberId,
        startAt: { gte: endToday },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      },
      include: { customer: true, service: true, payments: true },
      orderBy: { startAt: "asc" },
      take: 6,
    }),
    prisma.appointment.findMany({
      where: { barberId, startAt: { gte: startMonth, lt: endToday } },
      select: { status: true },
    }),
    prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startMonth, lt: endToday },
        appointment: { barberId },
      },
      select: { amountCents: true },
    }),
  ]);

  const activeToday = today.filter((appointment) =>
    ["PENDING_PAYMENT", "CONFIRMED"].includes(appointment.status),
  );
  const completedMonth = monthAppointments.filter((appointment) => appointment.status === "COMPLETED").length;
  const revenueMonth = monthPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const next = today.find((appointment) => appointment.startAt >= new Date());

  return (
    <div>
      <PageHeader
        title={`Hola, ${user.name.split(" ")[0]}`}
        description={`${formatDateShort(new Date())} · ${activeToday.length} cita${activeToday.length === 1 ? "" : "s"} pendiente${activeToday.length === 1 ? "" : "s"} hoy`}
        action={{ href: "/barbero/agenda", label: "Ver agenda", icon: <CalendarDays className="h-4 w-4" /> }}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Citas hoy"
          value={String(activeToday.length)}
          hint={next ? `Próxima ${formatTime(next.startAt)}` : "Sin pendientes"}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label="Completadas del mes"
          value={String(completedMonth)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Anticipos del mes"
          value={formatMoney(revenueMonth)}
          hint="Pagos verificados de tus citas"
          icon={<Wallet className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Próximas citas"
          value={String(upcoming.length)}
          hint="Siguientes 6 en agenda"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-ink-850/60 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h3 className="text-sm font-semibold text-stone-200">Tu día</h3>
            <Link href="/barbero/agenda" className="inline-flex items-center gap-1 text-[10px] text-gold-400 hover:text-gold-300">
              Agenda completa
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {today.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Scissors className="h-7 w-7" />}
                title="Sin citas para hoy"
                description="Disfruta el descanso o revisa tu disponibilidad semanal."
                action={
                  <Link href="/barbero/disponibilidad" className={buttonClasses({ variant: "outline", size: "sm" })}>
                    Mi disponibilidad
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {today.map((appointment) => {
                const paid = appointment.payments.some((payment) => payment.status === "PAID");
                return (
                  <Link
                    key={appointment.id}
                    href={`/barbero/agenda?fecha=${key}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.03]"
                  >
                    <div className="w-14 shrink-0 text-right">
                      <p className="text-xs font-semibold text-stone-200">{formatTime(appointment.startAt)}</p>
                      <p className="text-[9px] text-stone-600">{appointment.service.durationMin} min</p>
                    </div>
                    <span className="h-8 w-px bg-gold-500/30" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-stone-200">{appointment.customer.name}</p>
                      <p className="truncate text-[10px] text-stone-500">{appointment.service.name}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-[11px] text-stone-300">{formatMoney(appointment.totalCents)}</p>
                      <p className={`text-[9px] ${paid ? "text-emerald-400" : "text-amber-400"}`}>
                        {paid ? "Anticipo pagado" : "Cobro en local"}
                      </p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-ink-850/60">
          <div className="border-b border-white/5 px-5 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <Clock className="h-4 w-4 text-gold-500" />
              Próximas
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-[10px] text-stone-600">No hay citas futuras.</p>
            ) : (
              upcoming.map((appointment) => (
                <div key={appointment.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-medium text-stone-200">{appointment.customer.name}</p>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <p className="mt-0.5 text-[9px] text-stone-500">
                    {formatDateShort(appointment.startAt)} · {formatTime(appointment.startAt)} ·{" "}
                    {appointment.service.name}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
