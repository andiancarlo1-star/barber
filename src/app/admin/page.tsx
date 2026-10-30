import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CreditCard,
  Scissors,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  addDaysToKey,
  dateKeyInTZ,
  formatDateShort,
  formatMoney,
  formatMoneyShort,
  formatTime,
  todayKey,
  zonedToUtc,
} from "@/lib/dates";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { StatusBadge, EmptyState, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const key = todayKey();
  const startToday = zonedToUtc(key, 0);
  const endToday = zonedToUtc(addDaysToKey(key, 1), 0);
  const startWeek = zonedToUtc(addDaysToKey(key, -6), 0);

  const [todayAppointments, revenueToday, revenueWeek, customers, pending, audit, weekPayments, upcoming] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { startAt: { gte: startToday, lt: endToday }, status: { not: "CANCELLED" } },
        include: { customer: true, service: true, barber: { include: { user: true } }, payments: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.payment.aggregate({
        where: { status: "PAID", paidAt: { gte: startToday, lt: endToday } },
        _sum: { amountCents: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: "PAID", paidAt: { gte: startWeek, lt: endToday } },
        _sum: { amountCents: true },
      }),
      prisma.customer.count(),
      prisma.appointment.findMany({
        where: { status: "PENDING_PAYMENT", startAt: { gte: new Date() } },
        include: { customer: true, service: true, barber: { include: { user: true } } },
        orderBy: { startAt: "asc" },
        take: 5,
      }),
      prisma.auditLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.payment.findMany({
        where: { status: "PAID", paidAt: { gte: startWeek, lt: endToday } },
        select: { amountCents: true, paidAt: true },
      }),
      prisma.appointment.findMany({
        where: { startAt: { gte: endToday }, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
        include: { customer: true, service: true, barber: { include: { user: true } } },
        orderBy: { startAt: "asc" },
        take: 4,
      }),
    ]);

  const days = Array.from({ length: 7 }, (_, index) => addDaysToKey(key, index - 6));
  const series = days.map((dayKey) => ({
    key: dayKey,
    label: formatDateShort(zonedToUtc(dayKey, 12 * 60)).replace(/ \d{4}$/, ""),
    total: weekPayments
      .filter((payment) => payment.paidAt && dateKeyInTZ(payment.paidAt) === dayKey)
      .reduce((sum, payment) => sum + payment.amountCents, 0),
  }));
  const maxSeries = Math.max(...series.map((item) => item.total), 1);

  const activeToday = todayAppointments.filter((appointment) =>
    ["PENDING_PAYMENT", "CONFIRMED"].includes(appointment.status),
  );

  return (
    <div>
      <PageHeader
        title="Hoy en Navaja"
        description={`${activeToday.length} cita${activeToday.length === 1 ? "" : "s"} activa${activeToday.length === 1 ? "" : "s"} · ${formatDateShort(new Date())}`}
        action={{ href: "/admin/citas/nueva", label: "Nueva cita", icon: <CalendarPlus className="h-4 w-4" /> }}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos de hoy"
          value={formatMoney(revenueToday._sum.amountCents ?? 0)}
          hint={`${revenueToday._count} pago${revenueToday._count === 1 ? "" : "s"} verificado${revenueToday._count === 1 ? "" : "s"}`}
          icon={<Wallet className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Citas de hoy"
          value={String(activeToday.length)}
          hint={`${todayAppointments.filter((a) => a.status === "COMPLETED").length} completadas`}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label="Últimos 7 días"
          value={formatMoney(revenueWeek._sum.amountCents ?? 0)}
          hint="Anticipos confirmados"
          icon={<TrendingUp className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Clientes registrados"
          value={String(customers)}
          hint={`${pending.length} pago${pending.length === 1 ? "" : "s"} pendiente${pending.length === 1 ? "" : "s"}`}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-ink-850/60 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-200">Agenda de hoy</h3>
              <p className="mt-0.5 text-[10px] text-stone-600">
                {formatDateShort(new Date())} · ordenada por hora
              </p>
            </div>
            <Link
              href="/admin/citas"
              className="inline-flex items-center gap-1 text-[11px] text-gold-400 hover:text-gold-300"
            >
              Ver todas
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<CalendarDays className="h-7 w-7" />}
                title="Sin citas para hoy"
                description="Aprovecha para revisar la agenda de la semana o crear una cita manual."
              />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {todayAppointments.map((appointment) => {
                const paid = appointment.payments.some((payment) => payment.status === "PAID");
                return (
                  <Link
                    key={appointment.id}
                    href={`/admin/citas/${appointment.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.03]"
                  >
                    <div className="w-14 shrink-0 text-right">
                      <p className="text-xs font-semibold text-stone-200">{formatTime(appointment.startAt)}</p>
                      <p className="text-[9px] text-stone-600">{appointment.service.durationMin} min</p>
                    </div>
                    <span className="h-8 w-px bg-gold-500/30" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-stone-200">
                        {appointment.customer.name}
                      </p>
                      <p className="truncate text-[10px] text-stone-500">
                        {appointment.service.name} · {appointment.barber.user.name}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-stone-300">{formatMoney(appointment.totalCents)}</p>
                      <p className={`text-[9px] ${paid ? "text-emerald-400" : "text-amber-400"}`}>
                        {paid ? "Anticipo pagado" : "Sin pago"}
                      </p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-200">Ingresos 7 días</h3>
              <Badge tone="gold">{formatMoneyShort(revenueWeek._sum.amountCents ?? 0)}</Badge>
            </div>
            <div className="mt-5 flex h-28 items-end gap-2">
              {series.map((item) => (
                <div key={item.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-20 w-full items-end justify-center">
                    <div
                      className="w-full max-w-7 rounded-t bg-gradient-to-t from-gold-700/70 to-gold-400/90"
                      style={{ height: `${Math.max((item.total / maxSeries) * 100, 3)}%` }}
                      title={formatMoney(item.total)}
                    />
                  </div>
                  <span className="text-[8px] uppercase text-stone-600">{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-200">Pagos pendientes</h3>
              <Link href="/admin/pagos" className="text-[10px] text-gold-400 hover:text-gold-300">
                Ver pagos
              </Link>
            </div>
            {pending.length === 0 ? (
              <p className="mt-4 text-[11px] text-stone-600">No hay pagos pendientes.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {pending.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/admin/citas/${appointment.id}`}
                    className="block rounded-lg border border-amber-500/15 bg-amber-500/[0.04] p-2.5 transition hover:border-amber-500/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-medium text-stone-200">
                        {appointment.customer.name}
                      </p>
                      <span className="shrink-0 text-[10px] text-amber-300">
                        {formatMoney(appointment.amountDueCents)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-stone-500">
                      {formatDateShort(appointment.startAt)} · {formatTime(appointment.startAt)} ·{" "}
                      {appointment.barber.user.name}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="text-sm font-semibold text-stone-200">Accesos rápidos</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <QuickLink href="/admin/citas/nueva" icon={<CalendarPlus className="h-3.5 w-3.5" />} label="Nueva cita" />
              <QuickLink href="/admin/clientes" icon={<UserPlus className="h-3.5 w-3.5" />} label="Clientes" />
              <QuickLink href="/admin/servicios" icon={<Scissors className="h-3.5 w-3.5" />} label="Servicios" />
              <QuickLink href="/admin/pagos" icon={<CreditCard className="h-3.5 w-3.5" />} label="Pagos" />
            </div>
          </section>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-ink-850/60">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h3 className="text-sm font-semibold text-stone-200">Próximas citas</h3>
            <Link href="/admin/calendario" className="text-[10px] text-gold-400 hover:text-gold-300">
              Calendario
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-[11px] text-stone-600">Sin citas próximas.</p>
            ) : (
              upcoming.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/admin/citas/${appointment.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-xs hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-200">{appointment.customer.name}</p>
                    <p className="truncate text-[10px] text-stone-500">
                      {appointment.service.name} · {appointment.barber.user.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-stone-300">{formatDateShort(appointment.startAt)}</p>
                    <p className="text-[10px] text-stone-500">{formatTime(appointment.startAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-ink-850/60">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h3 className="text-sm font-semibold text-stone-200">Actividad reciente</h3>
            <Link href="/admin/auditoria" className="text-[10px] text-gold-400 hover:text-gold-300">
              Auditoría
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {audit.length === 0 ? (
              <p className="px-5 py-8 text-center text-[11px] text-stone-600">Sin actividad registrada.</p>
            ) : (
              audit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-stone-300">{log.action.replaceAll("_", " ")}</p>
                    <p className="mt-0.5 text-[9px] text-stone-600">
                      {log.user?.name ?? "Sistema"} · {formatDateShort(log.createdAt)}{" "}
                      {formatTime(log.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[8px] uppercase text-stone-500">
                    {log.entity}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-[10px] text-stone-400 transition hover:border-gold-500/30 hover:text-gold-200"
    >
      {icon}
      {label}
    </Link>
  );
}
