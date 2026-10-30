import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDateLong, formatDateTime, formatMoney, formatTime } from "@/lib/dates";
import { BrandMark } from "@/components/brand";
import { PrintButton } from "@/components/payments/print-button";
import { buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comprobante de pago",
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [appointment, settings] = await Promise.all([
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
  ]);

  if (!appointment) notFound();

  const payment = appointment.payments.find((p) => p.status === "PAID");
  const balance = Math.max(appointment.totalCents - (payment?.amountCents ?? 0), 0);

  return (
    <div className="container-px py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between no-print">
          <Link
            href={`/reserva/${appointment.code}`}
            className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-gold-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a mi reserva
          </Link>
          {payment ? <PrintButton /> : null}
        </div>

        <div className="receipt-card overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-card">
          <div className="flex items-start justify-between border-b border-white/10 bg-gradient-to-br from-gold-500/10 to-transparent px-7 py-6">
            <div className="flex items-center gap-3">
              <BrandMark className="h-12 w-12" />
              <div>
                <p className="font-display text-xl tracking-wide text-stone-50">
                  {settings.businessName}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-gold-400">
                  Comprobante de reserva
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-stone-500">
              <p className="font-mono text-sm text-stone-300">{appointment.code}</p>
              <p className="mt-1">Emitido {formatDateTime(new Date())}</p>
            </div>
          </div>

          <div className="grid gap-6 px-7 py-6 sm:grid-cols-2">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-stone-600">Cliente</p>
              <p className="mt-1 text-sm font-semibold text-stone-200">{appointment.customer.name}</p>
              <p className="text-xs text-stone-500">{appointment.customer.email}</p>
              <p className="text-xs text-stone-500">{appointment.customer.phone}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-stone-600">Barbería</p>
              <p className="mt-1 text-sm font-semibold text-stone-200">{settings.businessName}</p>
              <p className="text-xs text-stone-500">{settings.address}</p>
              <p className="text-xs text-stone-500">{settings.phone}</p>
            </div>
          </div>

          <div className="border-y border-white/10 px-7 py-5">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Servicio</span>
              <span>Importe</span>
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-stone-200">{appointment.service.name}</p>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  {formatDateLong(appointment.startAt)} · {formatTime(appointment.startAt)} ·{" "}
                  {appointment.service.durationMin} min · {appointment.barber.user.name}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-stone-200">
                {formatMoney(appointment.totalCents)}
              </p>
            </div>
          </div>

          {payment ? (
            <div className="px-7 py-5">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Pago verificado por la pasarela
                </p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <span className="text-stone-500">Método</span>
                  <span className="text-right text-stone-300">
                    {payment.cardBrand ?? "Tarjeta"} ••••{payment.cardLast4 ?? "****"}
                  </span>
                  <span className="text-stone-500">Autorización</span>
                  <span className="text-right font-mono text-stone-300">
                    {payment.authorizationCode ?? "—"}
                  </span>
                  <span className="text-stone-500">Referencia</span>
                  <span className="text-right font-mono text-[10px] text-stone-400">
                    {payment.externalId}
                  </span>
                  <span className="text-stone-500">Fecha de pago</span>
                  <span className="text-right text-stone-300">
                    {payment.paidAt ? formatDateTime(payment.paidAt) : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between text-stone-500">
                  <span>Total del servicio</span>
                  <span>{formatMoney(appointment.totalCents)}</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>Anticipo pagado</span>
                  <span>-{formatMoney(payment.amountCents)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-stone-100">
                  <span>Saldo pendiente en el local</span>
                  <span>{formatMoney(balance)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-7 py-8 text-center">
              <p className="text-sm text-stone-300">Aún no hay un pago registrado para esta reserva.</p>
              <p className="mt-1 text-xs text-stone-500">
                Una vez que la pasarela confirme el pago, podrás descargar tu comprobante.
              </p>
            </div>
          )}

          <div className="border-t border-white/10 bg-white/[0.015] px-7 py-4">
            <p className="text-[10px] leading-relaxed text-stone-600">
              Este comprobante acredita el anticipo de una reserva de servicios de barbería y no
              constituye factura fiscal. Para facturación, solicítala al {settings.phone} o{" "}
              {settings.email}. Política de cancelación: hasta {settings.cancellationHours} horas
              antes de la cita. Navaja no almacena números completos de tarjeta ni CVV.
            </p>
          </div>
        </div>

        <div className="mt-5 text-center no-print">
          <Link href="/" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Ir al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
