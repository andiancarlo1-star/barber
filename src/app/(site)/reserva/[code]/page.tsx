import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MapPin,
  MessageCircle,
  Scissors,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth-helpers";
import { formatDateLong, formatDateTime, formatMoney, formatTime } from "@/lib/dates";
import { whatsappLink } from "@/lib/utils";
import { Alert, StatusBadge, buttonClasses } from "@/components/ui";
import {
  CancelAppointmentButton,
  CopyCodeButton,
  PayNowButton,
} from "@/components/booking/reservation-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu reserva",
  robots: { index: false, follow: false },
};

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pago?: string; confirmada?: string }>;
}) {
  const { code } = await params;
  const query = await searchParams;

  const [appointment, settings, user] = await Promise.all([
    prisma.appointment.findUnique({
      where: { code },
      include: {
        customer: true,
        service: true,
        barber: { include: { user: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
    getSettings(),
    getSessionUser(),
  ]);

  if (!appointment) notFound();

  const paidPayment = appointment.payments.find((p) => p.status === "PAID");
  const failedPayment = appointment.payments.find((p) => p.status === "FAILED");
  const balance = Math.max(
    appointment.totalCents - (paidPayment?.amountCents ?? 0),
    0,
  );
  const canCancel =
    appointment.status !== "CANCELLED" &&
    appointment.status !== "COMPLETED" &&
    (user?.role === "ADMIN" ||
      (user?.role === "CUSTOMER" &&
        user.email.toLowerCase() === appointment.customer.email.toLowerCase()));
  const hoursUntil = (appointment.startAt.getTime() - Date.now()) / 3_600_000;
  const withinCancellationWindow = hoursUntil >= settings.cancellationHours;

  const steps = [
    { label: "Reserva creada", done: true },
    {
      label: "Pago verificado",
      done: Boolean(paidPayment),
      skipped: !settings.requirePayment,
    },
    {
      label: "Cita confirmada",
      done: ["CONFIRMED", "COMPLETED"].includes(appointment.status),
    },
    { label: "Cita completada", done: appointment.status === "COMPLETED" },
  ];

  return (
    <div className="container-px py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {query.confirmada ? (
          <Alert tone="success" className="mb-6">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              ¡Reserva creada! {settings.requirePayment ? "Completa el pago para confirmarla." : "Te esperamos."}
            </span>
          </Alert>
        ) : null}
        {query.pago === "ok" ? (
          <Alert tone="success" className="mb-6">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Pago confirmado por la pasarela. Tu cita está asegurada.
            </span>
          </Alert>
        ) : null}
        {query.pago === "error" ? (
          <Alert tone="error" className="mb-6">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              El pago no se completó. Puedes reintentarlo sin perder tu horario.
            </span>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Detalle de tu cita</p>
            <h1 className="mt-2 text-3xl sm:text-4xl">{appointment.service.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={appointment.status} />
              <span className="font-mono text-xs text-stone-500">{appointment.code}</span>
              <CopyCodeButton code={appointment.code} />
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Link href="/reservar" className={buttonClasses({ variant: "outline", size: "sm" })}>
              Reservar otra cita
            </Link>
            <span className="text-[10px] text-stone-600">
              Creada el {formatDateTime(appointment.createdAt)}
            </span>
          </div>
        </div>

        {/* Status timeline */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.label}
              className={`rounded-xl border p-3 ${
                step.done
                  ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    step.done
                      ? "bg-emerald-500 text-ink-950"
                      : "border border-white/15 text-stone-600"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    step.done ? "text-emerald-200" : "text-stone-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-5">
          <div className="card-dark md:col-span-3">
            <div className="border-b border-white/5 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400">Información</p>
            </div>
            <div className="space-y-4 px-5 py-5 text-sm">
              <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Fecha">
                {formatDateLong(appointment.startAt)}
              </InfoRow>
              <InfoRow icon={<Clock className="h-4 w-4" />} label="Hora">
                {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)} (
                {appointment.service.durationMin} min)
              </InfoRow>
              <InfoRow icon={<UserRound className="h-4 w-4" />} label="Barbero">
                {appointment.barber.user.name}
              </InfoRow>
              <InfoRow icon={<Scissors className="h-4 w-4" />} label="Cliente">
                {appointment.customer.name} · {appointment.customer.phone}
              </InfoRow>
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Dirección">
                {settings.address}
              </InfoRow>
              {appointment.notes ? (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-stone-400">
                  <span className="text-stone-600">Notas: </span>
                  {appointment.notes}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/5 px-5 py-4">
              <a
                href={`/api/appointments/${appointment.code}/ics`}
                className={buttonClasses({ variant: "dark", size: "sm" })}
              >
                <Download className="h-3.5 w-3.5" />
                Agregar al calendario
              </a>
              <a
                href={whatsappLink(
                  settings.whatsapp,
                  `Hola, tengo una consulta sobre mi reserva ${appointment.code}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "dark", size: "sm" })}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              {paidPayment ? (
                <Link
                  href={`/reserva/${appointment.code}/comprobante`}
                  className={buttonClasses({ variant: "dark", size: "sm" })}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Comprobante
                </Link>
              ) : null}
            </div>
          </div>

          <div className="card-dark md:col-span-2">
            <div className="border-b border-white/5 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400">Pago</p>
            </div>
            <div className="px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-stone-500">Total del servicio</span>
                <span className="text-lg font-semibold text-stone-100">
                  {formatMoney(appointment.totalCents)}
                </span>
              </div>
              <div className="mt-3 space-y-2 border-t border-white/5 pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Anticipo pagado</span>
                  <span className={paidPayment ? "text-emerald-300" : "text-stone-500"}>
                    {formatMoney(paidPayment?.amountCents ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Saldo en el local</span>
                  <span className="text-stone-300">{formatMoney(balance)}</span>
                </div>
              </div>

              {paidPayment ? (
                <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-[11px] text-emerald-200/90">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Pago verificado
                  </p>
                  <p className="mt-1 text-emerald-100/60">
                    {paidPayment.cardBrand ?? "Tarjeta"} ••••{paidPayment.cardLast4 ?? "****"} ·{" "}
                    {formatMoney(paidPayment.amountCents)}
                  </p>
                  {paidPayment.authorizationCode ? (
                    <p className="mt-0.5 text-emerald-100/50">
                      Autorización {paidPayment.authorizationCode}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {appointment.status === "PENDING_PAYMENT" ? (
                <div className="mt-4">
                  <Alert tone="warning" className="mb-3 text-[11px]">
                    Tu horario está reservado pero aún no confirmado. Completa el anticipo para
                    asegurarlo.
                  </Alert>
                  <PayNowButton
                    code={appointment.code}
                    label={`Pagar ${formatMoney(appointment.amountDueCents || appointment.totalCents)}`}
                  />
                  {failedPayment?.failureReason ? (
                    <p className="mt-2 text-[10px] text-red-300/80">
                      Último intento: {failedPayment.failureReason}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {appointment.status === "CONFIRMED" && !paidPayment && !settings.requirePayment ? (
                <p className="mt-4 text-[11px] text-stone-500">
                  No se requiere anticipo. Pagas directamente en la barbería.
                </p>
              ) : null}

              {appointment.status === "CANCELLED" ? (
                <Alert tone="error" className="mt-4 text-[11px]">
                  Esta reserva fue cancelada
                  {appointment.cancelledReason ? `: ${appointment.cancelledReason}` : "."}
                </Alert>
              ) : null}

              {canCancel ? (
                <div className="mt-5 border-t border-white/5 pt-4">
                  {withinCancellationWindow ? (
                    <CancelAppointmentButton code={appointment.code} />
                  ) : (
                    <p className="text-[10px] leading-relaxed text-stone-600">
                      Ya no puedes cancelar en línea (menos de {settings.cancellationHours} h).
                      Escríbenos por WhatsApp.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-xs font-semibold text-stone-200">¿Necesitas cambiar algo?</p>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Escríbenos y te ayudamos a reprogramar tu cita.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`tel:${settings.phone.replace(/\s/g, "")}`}
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              Llamar
            </a>
            <a
              href={whatsappLink(settings.whatsapp, `Hola, quiero reprogramar mi cita ${appointment.code}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "gold", size: "sm" })}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-stone-500 hover:text-gold-300">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
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
        <p className="text-[10px] uppercase tracking-[0.16em] text-stone-600">{label}</p>
        <p className="mt-0.5 text-stone-200">{children}</p>
      </div>
    </div>
  );
}
