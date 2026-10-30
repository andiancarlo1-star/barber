import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  dateKeyInTZ,
  formatDateLong,
  formatDateTime,
  formatMoney,
  formatTime,
  timeInTZ,
} from "@/lib/dates";
import { whatsappLink } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmButton } from "@/components/admin/form-controls";
import { Alert, Badge, StatusBadge, buttonClasses, Field, Input, Textarea } from "@/components/ui";
import {
  rescheduleAppointmentAction,
  saveAppointmentNotesAction,
  updateAppointmentStatusAction,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: true,
      service: true,
      barber: { include: { user: true } },
      payments: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { createdAt: "desc" }, take: 8 },
      createdBy: { select: { name: true } },
    },
  });

  if (!appointment) notFound();

  const paid = appointment.payments.filter((payment) => payment.status === "PAID");
  const paidTotal = paid.reduce((sum, payment) => sum + payment.amountCents, 0);
  const balance = Math.max(appointment.totalCents - paidTotal, 0);
  const active = ["PENDING_PAYMENT", "CONFIRMED"].includes(appointment.status);
  const redirectTo = `/admin/citas/${appointment.id}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/citas"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-gold-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a citas
      </Link>

      <PageHeader
        title={appointment.customer.name}
        description={`${appointment.service.name} · ${formatDateLong(appointment.startAt)} · ${formatTime(appointment.startAt)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={appointment.status} />
            <Link
              href={`/reserva/${appointment.code}`}
              target="_blank"
              className={buttonClasses({ variant: "dark", size: "sm" })}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Página del cliente
            </Link>
          </div>
        }
      />

      {query.ok ? (
        <Alert tone="success" className="mb-4">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Cambios guardados.
          </span>
        </Alert>
      ) : null}
      {query.error ? (
        <Alert tone="error" className="mb-4">
          {query.error}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl border border-white/10 bg-ink-850/60">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h3 className="text-sm font-semibold text-stone-200">Detalle de la cita</h3>
              <span className="font-mono text-[10px] text-stone-600">{appointment.code}</span>
            </div>
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
              <Info icon={<UserRound className="h-4 w-4" />} label="Cliente">
                <p className="text-stone-200">{appointment.customer.name}</p>
                <p className="text-[11px] text-stone-500">{appointment.customer.email}</p>
                <p className="text-[11px] text-stone-500">{appointment.customer.phone}</p>
                <div className="mt-2 flex gap-1.5">
                  <a
                    href={whatsappLink(appointment.customer.phone, `Hola ${appointment.customer.name.split(" ")[0]}, te escribimos de Navaja por tu cita ${appointment.code}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="mr-1 inline h-3 w-3" />
                    WhatsApp
                  </a>
                  <a
                    href={`tel:${appointment.customer.phone}`}
                    className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-stone-400 hover:text-stone-200"
                  >
                    <Phone className="mr-1 inline h-3 w-3" />
                    Llamar
                  </a>
                  <a
                    href={`mailto:${appointment.customer.email}`}
                    className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-stone-400 hover:text-stone-200"
                  >
                    <Mail className="mr-1 inline h-3 w-3" />
                    Correo
                  </a>
                </div>
              </Info>
              <Info icon={<Scissors className="h-4 w-4" />} label="Servicio">
                <p className="text-stone-200">{appointment.service.name}</p>
                <p className="text-[11px] text-stone-500">
                  {appointment.service.durationMin} min · {formatMoney(appointment.totalCents)}
                </p>
              </Info>
              <Info icon={<CalendarClock className="h-4 w-4" />} label="Horario">
                <p className="text-stone-200">{formatDateLong(appointment.startAt)}</p>
                <p className="text-[11px] text-stone-500">
                  {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}
                </p>
              </Info>
              <Info icon={<UserRound className="h-4 w-4" />} label="Barbero">
                <p className="text-stone-200">{appointment.barber.user.name}</p>
                <p className="text-[11px] text-stone-500">{appointment.barber.title ?? "Barbero"}</p>
              </Info>
              <Info icon={<MapPin className="h-4 w-4" />} label="Creada">
                <p className="text-stone-200">{formatDateTime(appointment.createdAt)}</p>
                <p className="text-[11px] text-stone-500">
                  {appointment.createdBy?.name ?? "Cliente en línea"}
                </p>
              </Info>
              <Info icon={<Clock className="h-4 w-4" />} label="Recordatorio">
                <p className="text-stone-200">
                  {appointment.reminderSentAt ? formatDateTime(appointment.reminderSentAt) : "No enviado"}
                </p>
              </Info>
            </div>
            {appointment.notes ? (
              <div className="border-t border-white/5 px-5 py-4">
                <p className="text-[9px] uppercase tracking-[0.16em] text-stone-600">Notas del cliente</p>
                <p className="mt-1 text-xs text-stone-400">{appointment.notes}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <CreditCard className="h-4 w-4 text-gold-500" />
              Pagos
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
              <div>
                <p className="text-[9px] uppercase text-stone-600">Total</p>
                <p className="mt-0.5 text-sm text-stone-200">{formatMoney(appointment.totalCents)}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-stone-600">Pagado</p>
                <p className="mt-0.5 text-sm text-emerald-300">{formatMoney(paidTotal)}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-stone-600">Saldo</p>
                <p className="mt-0.5 text-sm text-amber-300">{formatMoney(balance)}</p>
              </div>
            </div>
            {appointment.payments.length === 0 ? (
              <p className="mt-4 text-[11px] text-stone-600">No hay intentos de pago registrados.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[11px]">
                  <thead className="border-b border-white/5 text-[8px] uppercase tracking-wide text-stone-600">
                    <tr>
                      <th className="py-2 font-medium">Referencia</th>
                      <th className="py-2 font-medium">Proveedor</th>
                      <th className="py-2 font-medium">Monto</th>
                      <th className="py-2 font-medium">Estado</th>
                      <th className="py-2 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {appointment.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="py-2 font-mono text-[9px] text-stone-500">{payment.externalId}</td>
                        <td className="py-2 text-stone-400">{payment.provider}</td>
                        <td className="py-2 text-stone-300">{formatMoney(payment.amountCents)}</td>
                        <td className="py-2">
                          <StatusBadge status={payment.status} />
                        </td>
                        <td className="py-2 text-[10px] text-stone-500">
                          {formatDateTime(payment.paidAt ?? payment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {paid.length > 0 ? (
              <Link
                href={`/reserva/${appointment.code}/comprobante`}
                target="_blank"
                className="mt-4 inline-flex items-center gap-1.5 text-[10px] text-gold-400 hover:text-gold-300"
              >
                <ExternalLink className="h-3 w-3" />
                Ver comprobante del cliente
              </Link>
            ) : null}
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="text-sm font-semibold text-stone-200">Notas internas</h3>
            <p className="mt-0.5 text-[10px] text-stone-600">
              Solo visibles para el equipo. No se incluyen en correos ni en la página del cliente.
            </p>
            <form action={saveAppointmentNotesAction} className="mt-3">
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <Textarea
                name="internalNotes"
                rows={3}
                defaultValue={appointment.internalNotes ?? ""}
                placeholder="Ej. Cliente prefiere máquina 1 a los lados, llegó tarde la última vez…"
              />
              <div className="mt-2 flex justify-end">
                <button type="submit" className={buttonClasses({ variant: "dark", size: "sm" })}>
                  Guardar notas
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-5">
          {active ? (
            <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
              <h3 className="text-sm font-semibold text-stone-200">Acciones</h3>
              <div className="mt-3 space-y-2">
                {appointment.status === "PENDING_PAYMENT" ? (
                  <form action={updateAppointmentStatusAction}>
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <input type="hidden" name="intent" value="confirm" />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <ConfirmButton
                      confirm="¿Confirmar sin pago en línea? El saldo quedará para cobro en el local."
                      variant="success"
                      className="w-full"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirmar sin pago
                    </ConfirmButton>
                  </form>
                ) : null}
                {appointment.status === "CONFIRMED" ? (
                  <form action={updateAppointmentStatusAction}>
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <input type="hidden" name="intent" value="complete" />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <ConfirmButton confirm="¿Marcar como completada?" variant="success" className="w-full">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Marcar completada
                    </ConfirmButton>
                  </form>
                ) : null}
                {appointment.status === "CONFIRMED" ? (
                  <form action={updateAppointmentStatusAction}>
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <input type="hidden" name="intent" value="noshow" />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <ConfirmButton confirm="¿Registrar no asistencia?" variant="dark" className="w-full">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      No asistió
                    </ConfirmButton>
                  </form>
                ) : null}
                <form action={updateAppointmentStatusAction}>
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="intent" value="cancel" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <ConfirmButton
                    confirm="¿Cancelar esta cita? Se notificará al cliente y se liberará el horario."
                    variant="danger"
                    className="w-full"
                  >
                    Cancelar cita
                  </ConfirmButton>
                </form>
              </div>
            </section>
          ) : null}

          {active ? (
            <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
              <h3 className="text-sm font-semibold text-stone-200">Reprogramar</h3>
              <form action={rescheduleAppointmentAction} className="mt-3 space-y-3">
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <Field label="Nueva fecha" htmlFor="date">
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    defaultValue={dateKeyInTZ(appointment.startAt)}
                  />
                </Field>
                <Field label="Nueva hora" htmlFor="time">
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    required
                    step={900}
                    defaultValue={timeInTZ(appointment.startAt)}
                  />
                </Field>
                <button type="submit" className={buttonClasses({ variant: "outline", size: "sm", className: "w-full" })}>
                  <CalendarClock className="h-3.5 w-3.5" />
                  Reprogramar
                </button>
                <p className="text-[9px] leading-relaxed text-stone-600">
                  Se validan choques, bloqueos y horario. El cliente recibe una notificación.
                </p>
              </form>
            </section>
          ) : null}

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="text-sm font-semibold text-stone-200">Notificaciones</h3>
            {appointment.notifications.length === 0 ? (
              <p className="mt-3 text-[11px] text-stone-600">Sin notificaciones registradas.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {appointment.notifications.map((notification) => (
                  <div key={notification.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-stone-300">
                        {notification.type.replaceAll("_", " ")}
                      </span>
                      <Badge
                        tone={
                          notification.status === "SENT"
                            ? "green"
                            : notification.status === "FAILED"
                              ? "red"
                              : "neutral"
                        }
                      >
                        {notification.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-stone-600">
                      {notification.channel} · {notification.recipient}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-gold-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.16em] text-stone-600">{label}</p>
        <div className="mt-0.5 text-xs">{children}</div>
      </div>
    </div>
  );
}
