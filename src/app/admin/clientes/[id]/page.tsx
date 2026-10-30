import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  Scissors,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateLong, formatDateTime, formatMoney, formatTime } from "@/lib/dates";
import { whatsappLink } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { CustomerForm } from "@/components/admin/customer-form";
import { Badge, EmptyState, StatusBadge, buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  await searchParams;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: { select: { role: true, active: true, createdAt: true } },
      appointments: {
        orderBy: { startAt: "desc" },
        include: { service: true, barber: { include: { user: true } }, payments: true },
      },
    },
  });
  if (!customer) notFound();

  const completed = customer.appointments.filter((appointment) => appointment.status === "COMPLETED");
  const upcoming = customer.appointments
    .filter(
      (appointment) =>
        appointment.startAt > new Date() &&
        ["CONFIRMED", "PENDING_PAYMENT"].includes(appointment.status),
    )
    .reverse();
  const spent = customer.appointments
    .flatMap((appointment) => appointment.payments)
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const noShows = customer.appointments.filter((appointment) => appointment.status === "NO_SHOW").length;
  const lastVisit = completed[0]?.startAt;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-gold-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a clientes
      </Link>

      <PageHeader
        title={customer.name}
        description={`Cliente desde ${formatDateTime(customer.createdAt)}${customer.user ? " · cuenta registrada" : " · reserva como invitado"}`}
        action={
          <div className="flex gap-2">
            <a
              href={whatsappLink(customer.phone, `Hola ${customer.name.split(" ")[0]}, te escribimos de Navaja Barber Studio.`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "success", size: "sm" })}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
            <a href={`tel:${customer.phone}`} className={buttonClasses({ variant: "dark", size: "sm" })}>
              <Phone className="h-3.5 w-3.5" />
              Llamar
            </a>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Visitas completadas" value={String(completed.length)} tone="gold" />
        <StatCard label="Total pagado" value={formatMoney(spent)} tone="green" />
        <StatCard label="No asistió" value={String(noShows)} tone={noShows > 0 ? "red" : "neutral"} />
        <StatCard
          label="Última visita"
          value={lastVisit ? formatDateLong(lastVisit).split(" de ")[0] : "—"}
          hint={lastVisit ? formatTime(lastVisit) : "Sin visitas"}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl border border-white/10 bg-ink-850/60">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h3 className="text-sm font-semibold text-stone-200">Historial de citas</h3>
              <Badge tone="neutral">{customer.appointments.length} total</Badge>
            </div>
            {customer.appointments.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<CalendarDays className="h-7 w-7" />}
                  title="Sin citas registradas"
                  description="Este cliente todavía no tiene reservas."
                  action={
                    <Link href="/admin/citas/nueva" className={buttonClasses({ variant: "gold", size: "sm" })}>
                      Crear cita
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {customer.appointments.map((appointment) => {
                  const paid = appointment.payments.some((payment) => payment.status === "PAID");
                  return (
                    <Link
                      key={appointment.id}
                      href={`/admin/citas/${appointment.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.03]"
                    >
                      <div className="w-16 shrink-0">
                        <p className="text-[10px] font-medium text-stone-300">
                          {formatDateLong(appointment.startAt).split(" de ")[0]}
                        </p>
                        <p className="text-[9px] text-stone-600">{formatTime(appointment.startAt)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-stone-200">{appointment.service.name}</p>
                        <p className="truncate text-[10px] text-stone-500">
                          <Scissors className="mr-1 inline h-2.5 w-2.5" />
                          {appointment.barber.user.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-stone-300">{formatMoney(appointment.totalCents)}</p>
                        <p className={`text-[9px] ${paid ? "text-emerald-400" : "text-amber-400"}`}>
                          {paid ? "Pagado" : "Sin pago"}
                        </p>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {upcoming.length > 0 ? (
            <section className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gold-200">
                <Clock className="h-4 w-4" />
                Próximas citas
              </h3>
              <div className="mt-3 space-y-2">
                {upcoming.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/admin/citas/${appointment.id}`}
                    className="flex items-center justify-between rounded-lg border border-gold-500/15 bg-ink-900/50 px-3 py-2"
                  >
                    <div>
                      <p className="text-xs text-stone-200">{appointment.service.name}</p>
                      <p className="text-[10px] text-stone-500">
                        {formatDateLong(appointment.startAt)} · {formatTime(appointment.startAt)}
                      </p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="text-sm font-semibold text-stone-200">Datos de contacto</h3>
            <div className="mt-3 space-y-2 text-[11px]">
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-2 text-stone-400 hover:text-gold-300"
              >
                <Mail className="h-3.5 w-3.5 text-stone-600" />
                {customer.email}
              </a>
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-2 text-stone-400 hover:text-gold-300"
              >
                <Phone className="h-3.5 w-3.5 text-stone-600" />
                {customer.phone}
              </a>
              <p className="flex items-center gap-2 text-stone-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-stone-600" />
                {customer.user ? "Cuenta registrada" : "Reserva como invitado"}
              </p>
            </div>
            <div className="mt-4 border-t border-white/5 pt-4">
              <CustomerForm
                customer={{
                  id: customer.id,
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  notes: customer.notes,
                }}
              />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="text-sm font-semibold text-stone-200">Resumen</h3>
            <dl className="mt-3 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-stone-600">Ticket promedio</dt>
                <dd className="text-stone-300">
                  {formatMoney(completed.length ? Math.round(spent / Math.max(completed.length, 1)) : 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-600">Canceladas</dt>
                <dd className="text-stone-300">
                  {customer.appointments.filter((a) => a.status === "CANCELLED").length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-600">Barbero frecuente</dt>
                <dd className="text-stone-300">{frequentBarber(customer.appointments)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function frequentBarber(appointments: Array<{ barber: { user: { name: string } } }>) {
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    const name = appointment.barber.user.name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "—";
}
