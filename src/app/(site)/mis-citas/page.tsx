import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Clock,
  History,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getSettings } from "@/lib/settings";
import { formatDateLong, formatMoney, formatTime, formatDateTime } from "@/lib/dates";
import { buttonClasses, EmptyState, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mis citas" };

export default async function MyAppointmentsPage() {
  const user = await requireUser("/mis-citas");
  const settings = await getSettings();

  const customer = await prisma.customer.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    include: {
      appointments: {
        orderBy: { startAt: "desc" },
        include: { service: true, barber: { include: { user: true } }, payments: true },
      },
    },
  });

  const appointments = customer?.appointments ?? [];
  const now = Date.now();
  const upcoming = appointments
    .filter(
      (appointment) =>
        appointment.startAt.getTime() >= now &&
        ["PENDING_PAYMENT", "CONFIRMED"].includes(appointment.status),
    )
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const past = appointments.filter((appointment) => !upcoming.includes(appointment));
  const next = upcoming[0];
  const paid = appointments
    .flatMap((appointment) => appointment.payments)
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <div className="container-px py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Tu cuenta</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Hola, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-stone-500">
            {appointments.length === 0
              ? "Aún no tienes citas registradas."
              : `${appointments.length} cita${appointments.length === 1 ? "" : "s"} en total · ${formatMoney(paid)} en anticipos pagados.`}
          </p>
        </div>
        <Link href="/reservar" className={buttonClasses({ variant: "gold" })}>
          <CalendarPlus className="h-4 w-4" />
          Reservar cita
        </Link>
      </div>

      {next ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-gold-500/25 bg-gradient-to-br from-gold-500/[0.12] via-ink-850 to-ink-850">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold-400">
                Próxima cita · {formatDateTime(next.startAt)}
              </p>
              <h2 className="mt-2 text-2xl">{next.service.name}</h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-gold-500" />
                  {formatDateLong(next.startAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold-500" />
                  {formatTime(next.startAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 text-gold-500" />
                  {next.barber.user.name}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <StatusBadge status={next.status} />
                <span className="font-mono text-[10px] text-stone-500">{next.code}</span>
              </div>
            </div>
            <Link
              href={`/reserva/${next.code}`}
              className={buttonClasses({ variant: "outline", size: "md" })}
            >
              Ver detalle
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg text-stone-200">
          <CalendarDays className="h-4 w-4 text-gold-500" />
          Próximas citas
        </h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title="Sin citas próximas"
              description="Reserva tu próximo corte y asegura tu horario con tu barbero favorito."
              action={
                <Link href="/reservar" className={buttonClasses({ variant: "gold", size: "sm" })}>
                  Reservar ahora
                </Link>
              }
            />
          ) : (
            upcoming.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} />
            ))
          )}
        </div>
      </section>

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg text-stone-200">
            <History className="h-4 w-4 text-stone-500" />
            Historial
          </h2>
          <div className="mt-4 space-y-3">
            {past.slice(0, 12).map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} muted />
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-10 text-center text-[11px] text-stone-600">
        ¿Necesitas ayuda con una reserva? Escríbenos a{" "}
        <a href={`mailto:${settings.email}`} className="link-gold">
          {settings.email}
        </a>
      </p>
    </div>
  );
}

function AppointmentRow({
  appointment,
  muted = false,
}: {
  appointment: {
    code: string;
    startAt: Date;
    status: string;
    totalCents: number;
    service: { name: string };
    barber: { user: { name: string } };
  };
  muted?: boolean;
}) {
  return (
    <Link
      href={`/reserva/${appointment.code}`}
      className={`group flex items-center gap-4 rounded-xl border border-white/10 bg-ink-850/60 px-4 py-3.5 transition hover:border-gold-500/30 hover:bg-ink-850 ${
        muted ? "opacity-70 hover:opacity-100" : ""
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-ink-900">
        <span className="text-[9px] uppercase tracking-wide text-stone-500">
          {formatTime(appointment.startAt).split(" ")[0]}
        </span>
        <span className="text-[9px] text-stone-600">
          {formatTime(appointment.startAt).split(" ")[1]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-200">{appointment.service.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-stone-500">
          {formatDateLong(appointment.startAt)} · {appointment.barber.user.name}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium text-stone-300">{formatMoney(appointment.totalCents)}</p>
        <p className="font-mono text-[9px] text-stone-600">{appointment.code}</p>
      </div>
      <StatusBadge status={appointment.status} />
      <ArrowRight className="h-4 w-4 shrink-0 text-stone-600 transition group-hover:text-gold-400" />
    </Link>
  );
}
