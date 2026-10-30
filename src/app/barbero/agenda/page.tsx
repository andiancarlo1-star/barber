import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Phone,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireBarber } from "@/lib/auth-helpers";
import {
  addDaysToKey,
  formatDateKeyLong,
  formatMoney,
  formatTime,
  todayKey,
  zonedToUtc,
} from "@/lib/dates";
import { whatsappLink } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { ConfirmButton } from "@/components/admin/form-controls";
import { Alert, EmptyState, StatusBadge, buttonClasses } from "@/components/ui";
import { updateAppointmentStatusAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function BarberAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; ok?: string; error?: string }>;
}) {
  const { barberId } = await requireBarber();
  const params = await searchParams;
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? "") ? params.fecha! : todayKey();
  const start = zonedToUtc(dateKey, 0);
  const end = zonedToUtc(addDaysToKey(dateKey, 1), 0);
  const redirectTo = `/barbero/agenda?fecha=${dateKey}`;

  const appointments = await prisma.appointment.findMany({
    where: { barberId, startAt: { gte: start, lt: end } },
    include: { customer: true, service: true, payments: true },
    orderBy: { startAt: "asc" },
  });

  const active = appointments.filter((appointment) =>
    ["CONFIRMED", "PENDING_PAYMENT"].includes(appointment.status),
  );
  const completed = appointments.filter((appointment) => appointment.status === "COMPLETED");
  const expected = appointments
    .filter((appointment) => !["CANCELLED", "NO_SHOW"].includes(appointment.status))
    .reduce((sum, appointment) => sum + appointment.totalCents, 0);

  return (
    <div>
      <PageHeader
        title="Mi agenda"
        description={formatDateKeyLong(dateKey)}
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/barbero/agenda?fecha=${addDaysToKey(dateKey, -1)}`}
              className={buttonClasses({ variant: "dark", size: "sm" })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href="/barbero/agenda" className={buttonClasses({ variant: "outline", size: "sm" })}>
              Hoy
            </Link>
            <Link
              href={`/barbero/agenda?fecha=${addDaysToKey(dateKey, 1)}`}
              className={buttonClasses({ variant: "dark", size: "sm" })}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {params.ok ? <Alert tone="success" className="mb-4">Cambios guardados correctamente.</Alert> : null}
      {params.error ? <Alert tone="error" className="mb-4">{params.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Citas activas" value={String(active.length)} icon={<Clock className="h-4 w-4" />} tone="gold" />
        <StatCard label="Completadas" value={String(completed.length)} tone="green" />
        <StatCard label="Facturación del día" value={formatMoney(expected)} hint="Total de servicios no cancelados" />
      </div>

      <div className="mt-5 space-y-3">
        {appointments.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-8 w-8" />}
            title="Sin citas este día"
            description="Revisa otro día o actualiza tu disponibilidad semanal."
            action={
              <Link href="/barbero/disponibilidad" className={buttonClasses({ variant: "outline", size: "sm" })}>
                Mi disponibilidad
              </Link>
            }
          />
        ) : (
          appointments.map((appointment) => {
            const paid = appointment.payments.find((payment) => payment.status === "PAID");
            const activeRow = ["CONFIRMED", "PENDING_PAYMENT"].includes(appointment.status);
            return (
              <div
                key={appointment.id}
                className={`rounded-xl border bg-ink-850/60 p-4 ${
                  activeRow ? "border-white/10" : "border-white/5 opacity-70"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-20 shrink-0">
                    <p className="text-sm font-semibold text-stone-100">{formatTime(appointment.startAt)}</p>
                    <p className="text-[10px] text-stone-500">
                      {appointment.service.durationMin} min
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-stone-200">{appointment.customer.name}</p>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {appointment.service.name} · {formatMoney(appointment.totalCents)}
                      {paid ? (
                        <span className="ml-1 text-emerald-400">· anticipo pagado</span>
                      ) : (
                        <span className="ml-1 text-amber-400">· cobro en local</span>
                      )}
                    </p>
                    {appointment.notes ? (
                      <p className="mt-1 text-[10px] text-stone-600">Nota: {appointment.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <a
                      href={whatsappLink(appointment.customer.phone, `Hola ${appointment.customer.name.split(" ")[0]}, te esperamos hoy a las ${formatTime(appointment.startAt)} en Navaja.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-emerald-500/20 px-2 py-1.5 text-[10px] text-emerald-300 hover:bg-emerald-500/10"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </a>
                    <a
                      href={`tel:${appointment.customer.phone}`}
                      className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-stone-400 hover:text-stone-200"
                      title="Llamar"
                    >
                      <Phone className="h-3 w-3" />
                    </a>
                    {appointment.status === "CONFIRMED" ? (
                      <>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="appointmentId" value={appointment.id} />
                          <input type="hidden" name="intent" value="complete" />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <ConfirmButton confirm="¿Marcar esta cita como completada?" variant="success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completar
                          </ConfirmButton>
                        </form>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="appointmentId" value={appointment.id} />
                          <input type="hidden" name="intent" value="noshow" />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <ConfirmButton confirm="¿Registrar que el cliente no asistió?" variant="dark">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </ConfirmButton>
                        </form>
                      </>
                    ) : null}
                    {activeRow ? (
                      <form action={updateAppointmentStatusAction}>
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <input type="hidden" name="intent" value="cancel" />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <ConfirmButton confirm="¿Cancelar esta cita? Se notificará al cliente." variant="danger">
                          Cancelar
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
