import { notFound, redirect } from "next/navigation";
import { CalendarDays, Clock, Scissors, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateLong, formatMoney, formatTime } from "@/lib/dates";
import { MockPaymentPanel } from "@/components/payments/mock-payment-panel";

export const dynamic = "force-dynamic";

export default async function MockPaymentPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      appointment: {
        include: {
          service: true,
          barber: { include: { user: true } },
          customer: true,
        },
      },
    },
  });

  if (!payment) notFound();
  if (payment.status === "PAID") {
    redirect(`/reserva/${payment.appointment.code}?pago=ok`);
  }
  if (payment.provider !== "MOCK") {
    redirect(`/reserva/${payment.appointment.code}`);
  }

  const appointment = payment.appointment;

  return (
    <div className="container-px mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <p className="eyebrow">Pago de reserva</p>
        <h1 className="mt-2 text-3xl">Completa tu anticipo</h1>
        <p className="mt-2 text-xs text-stone-500">Reserva {appointment.code}</p>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-ink-850 p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400">Servicio</p>
            <p className="mt-1 font-display text-xl text-stone-100">{appointment.service.name}</p>
          </div>
          <span className="rounded-full bg-gold-gradient px-3 py-1 text-sm font-bold text-ink-950">
            {formatMoney(appointment.totalCents)}
          </span>
        </div>

        <div className="mt-4 space-y-3 text-xs text-stone-400">
          <p className="flex items-center gap-2.5">
            <UserRound className="h-4 w-4 text-gold-500" />
            {appointment.barber.user.name}
          </p>
          <p className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-gold-500" />
            {formatDateLong(appointment.startAt)}
          </p>
          <p className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-gold-500" />
            {formatTime(appointment.startAt)} · {appointment.service.durationMin} min
          </p>
          <p className="flex items-center gap-2.5">
            <Scissors className="h-4 w-4 text-gold-500" />
            Anticipo: {formatMoney(payment.amountCents)} · Saldo:{" "}
            {formatMoney(Math.max(appointment.totalCents - payment.amountCents, 0))}
          </p>
        </div>
      </div>

      <MockPaymentPanel
        paymentId={payment.id}
        code={appointment.code}
        amountLabel={formatMoney(payment.amountCents)}
      />
    </div>
  );
}
