import Link from "next/link";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import {
  addDaysToKey,
  formatDateShort,
  formatMoney,
  formatTime,
  todayKey,
  zonedToUtc,
} from "@/lib/dates";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmButton } from "@/components/admin/form-controls";
import { Alert, EmptyState, StatusBadge, buttonClasses, Input, Select } from "@/components/ui";
import { updateAppointmentStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "hoy", label: "Hoy" },
  { key: "manana", label: "Mañana" },
  { key: "semana", label: "7 días" },
  { key: "todas", label: "Todas" },
] as const;

const STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; estado?: string; q?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const range = RANGES.some((item) => item.key === params.fecha) ? params.fecha! : "hoy";
  const status = params.estado && STATUSES.includes(params.estado) ? params.estado : "";
  const query = params.q?.trim() ?? "";

  const key = todayKey();
  const where: Prisma.AppointmentWhereInput = {};

  if (range === "hoy") {
    where.startAt = { gte: zonedToUtc(key, 0), lt: zonedToUtc(addDaysToKey(key, 1), 0) };
  } else if (range === "manana") {
    where.startAt = {
      gte: zonedToUtc(addDaysToKey(key, 1), 0),
      lt: zonedToUtc(addDaysToKey(key, 2), 0),
    };
  } else if (range === "semana") {
    where.startAt = { gte: zonedToUtc(key, 0), lt: zonedToUtc(addDaysToKey(key, 7), 0) };
  }
  if (status) where.status = status as AppointmentStatus;
  if (query) {
    where.OR = [
      { code: { contains: query, mode: "insensitive" } },
      { customer: { name: { contains: query, mode: "insensitive" } } },
      { customer: { email: { contains: query, mode: "insensitive" } } },
      { customer: { phone: { contains: query } } },
    ];
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      customer: true,
      service: true,
      barber: { include: { user: true } },
      payments: { where: { status: "PAID" }, take: 1 },
    },
    orderBy: { startAt: range === "todas" ? "desc" : "asc" },
    take: 120,
  });

  const counts = await prisma.appointment.groupBy({
    by: ["status"],
    where: range === "todas" ? {} : where.startAt ? { startAt: where.startAt } : {},
    _count: true,
  });
  const totalCount = counts.reduce((sum, item) => sum + item._count, 0);

  const prevKey = range === "hoy" ? addDaysToKey(key, -1) : null;

  return (
    <div>
      <PageHeader
        title="Citas"
        description="Gestiona la agenda, confirma pagos y registra la asistencia."
        action={{
          href: "/admin/citas/nueva",
          label: "Nueva cita",
          icon: <CalendarPlus className="h-4 w-4" />,
        }}
      />

      {params.ok ? (
        <Alert tone="success" className="mb-4">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {params.ok === "1" ? "Acción realizada correctamente." : `Reserva ${params.ok} creada.`}
          </span>
        </Alert>
      ) : null}
      {params.error ? (
        <Alert tone="error" className="mb-4">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {params.error}
          </span>
        </Alert>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-ink-850/60">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((item) => {
              const href = `/admin/citas?fecha=${item.key}${status ? `&estado=${status}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
              const active = range === item.key;
              return (
                <Link
                  key={item.key}
                  href={href}
                  className={`rounded-lg px-3 py-1.5 text-[11px] transition ${
                    active
                      ? "bg-gold-500/15 font-medium text-gold-200"
                      : "text-stone-500 hover:bg-white/5 hover:text-stone-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <form className="flex flex-wrap items-center gap-2" action="/admin/citas">
            <input type="hidden" name="fecha" value={range} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-600" />
              <Input
                name="q"
                defaultValue={query}
                placeholder="Código, cliente, correo…"
                className="h-9 w-52 py-0 pl-8 text-xs"
              />
            </div>
            <Select name="estado" defaultValue={status} className="h-9 w-40 py-0 text-xs">
              <option value="">Todos los estados</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value === "PENDING_PAYMENT"
                    ? "Pendiente de pago"
                    : value === "CONFIRMED"
                      ? "Confirmada"
                      : value === "COMPLETED"
                        ? "Completada"
                        : value === "CANCELLED"
                          ? "Cancelada"
                          : "No asistió"}
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonClasses({ variant: "dark", size: "sm" })}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtrar
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5 text-[10px] text-stone-600">
          <span>
            {appointments.length} resultado{appointments.length === 1 ? "" : "s"} · {totalCount} en el
            rango
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/citas?fecha=todas`}
              className="rounded p-1 hover:bg-white/5 hover:text-stone-300"
              title="Ver todas"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
            <span className="px-1">{range === "hoy" ? "Hoy" : range === "manana" ? "Mañana" : range === "semana" ? "Próximos 7 días" : "Histórico"}</span>
            <Link
              href={`/admin/citas?fecha=semana`}
              className="rounded p-1 hover:bg-white/5 hover:text-stone-300"
              title="Próximos 7 días"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<CalendarPlus className="h-8 w-8" />}
              title="No hay citas en este rango"
              description="Prueba con otro filtro o crea una cita manualmente."
              action={
                <Link href="/admin/citas/nueva" className={buttonClasses({ variant: "gold", size: "sm" })}>
                  Nueva cita
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="border-b border-white/5 text-[9px] uppercase tracking-[0.14em] text-stone-600">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Fecha / hora</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Servicio</th>
                  <th className="px-4 py-2.5 font-medium">Barbero</th>
                  <th className="px-4 py-2.5 font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {appointments.map((appointment) => {
                  const paid = appointment.payments.length > 0;
                  return (
                    <tr key={appointment.id} className="transition hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link href={`/admin/citas/${appointment.id}`} className="block">
                          <p className="font-medium text-stone-200">{formatDateShort(appointment.startAt)}</p>
                          <p className="text-[10px] text-stone-500">{formatTime(appointment.startAt)}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-200">{appointment.customer.name}</p>
                        <p className="text-[10px] text-stone-500">{appointment.customer.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-300">{appointment.service.name}</p>
                        <p className="text-[10px] text-stone-600">
                          {appointment.service.durationMin} min ·{" "}
                          <span className="font-mono">{appointment.code}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 text-stone-400">{appointment.barber.user.name}</td>
                      <td className="px-4 py-3">
                        <p className="text-stone-300">{formatMoney(appointment.totalCents)}</p>
                        <p className={`text-[9px] ${paid ? "text-emerald-400" : "text-amber-400"}`}>
                          {paid ? "Anticipo pagado" : "Sin pago"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appointment.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {appointment.status === "PENDING_PAYMENT" ? (
                            <form action={updateAppointmentStatusAction}>
                              <input type="hidden" name="appointmentId" value={appointment.id} />
                              <input type="hidden" name="intent" value="confirm" />
                              <input type="hidden" name="redirectTo" value="/admin/citas" />
                              <ConfirmButton
                                confirm="¿Confirmar esta cita sin pago en línea? Se asumirá el cobro en el local."
                                variant="success"
                                title="Confirmar manualmente"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </ConfirmButton>
                            </form>
                          ) : null}
                          {appointment.status === "CONFIRMED" ? (
                            <>
                              <form action={updateAppointmentStatusAction}>
                                <input type="hidden" name="appointmentId" value={appointment.id} />
                                <input type="hidden" name="intent" value="complete" />
                                <input type="hidden" name="redirectTo" value="/admin/citas" />
                                <ConfirmButton
                                  confirm="¿Marcar esta cita como completada?"
                                  variant="success"
                                  title="Completar"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </ConfirmButton>
                              </form>
                              <form action={updateAppointmentStatusAction}>
                                <input type="hidden" name="appointmentId" value={appointment.id} />
                                <input type="hidden" name="intent" value="noshow" />
                                <input type="hidden" name="redirectTo" value="/admin/citas" />
                                <ConfirmButton
                                  confirm="¿Registrar que el cliente no asistió?"
                                  variant="dark"
                                  title="No asistió"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </ConfirmButton>
                              </form>
                            </>
                          ) : null}
                          {["PENDING_PAYMENT", "CONFIRMED"].includes(appointment.status) ? (
                            <form action={updateAppointmentStatusAction}>
                              <input type="hidden" name="appointmentId" value={appointment.id} />
                              <input type="hidden" name="intent" value="cancel" />
                              <input type="hidden" name="redirectTo" value="/admin/citas" />
                              <ConfirmButton
                                confirm="¿Cancelar esta cita? Se notificará al cliente."
                                variant="danger"
                                title="Cancelar"
                              >
                                Cancelar
                              </ConfirmButton>
                            </form>
                          ) : null}
                          <Link
                            href={`/admin/citas/${appointment.id}`}
                            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-stone-400 hover:border-gold-500/30 hover:text-gold-200"
                          >
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-[10px] text-stone-600">
        {prevKey ? `Ayer: ${formatDateShort(zonedToUtc(prevKey, 12 * 60))} · ` : ""}
        Los pagos pendientes se liberan automáticamente si el cliente cancela. Las citas confirmadas
        manualmente registran el saldo para cobro en el local.
      </p>
    </div>
  );
}
