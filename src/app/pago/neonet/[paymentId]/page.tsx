import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildNeonetCheckout } from "@/lib/payments/neonet";
import { PaymentConfigError } from "@/lib/payments/types";
import { formatMoney } from "@/lib/dates";
import { NeonetRedirect } from "@/components/payments/neonet-redirect";
import { buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NeonetPaymentPage({
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
          customer: true,
          barber: { include: { user: true } },
        },
      },
    },
  });

  if (!payment) notFound();
  if (payment.status === "PAID") {
    redirect(`/reserva/${payment.appointment.code}?pago=ok`);
  }
  if (payment.provider !== "NEONET") {
    redirect(`/reserva/${payment.appointment.code}`);
  }

  let checkout: { action: string; fields: Record<string, string> } | null = null;
  let configError: string | null = null;

  try {
    checkout = buildNeonetCheckout({
      paymentId: payment.id,
      appointmentId: payment.appointmentId,
      externalId: payment.externalId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      description: `${payment.appointment.service.name} · ${payment.appointment.code}`,
      customerName: payment.appointment.customer.name,
      customerEmail: payment.appointment.customer.email,
      customerPhone: payment.appointment.customer.phone,
    });
  } catch (error) {
    configError =
      error instanceof PaymentConfigError
        ? error.message
        : "No se pudo iniciar la conexión con NeoNet.";
  }

  return (
    <div className="container-px mx-auto max-w-lg text-center">
      <p className="eyebrow">Pasarela NeoNet</p>
      <h1 className="mt-2 text-3xl">Pago seguro</h1>
      <p className="mt-2 text-xs text-stone-500">
        Reserva {payment.appointment.code} · {formatMoney(payment.amountCents)}
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-ink-850 p-6">
        {configError ? (
          <div className="text-left">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-semibold">NeoNet aún no está configurado</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">{configError}</p>
            <p className="mt-4 text-xs leading-relaxed text-stone-500">
              Mientras completas la afiliación con NeoNet, tu reserva queda pendiente. Puedes
              contactarnos por WhatsApp para coordinar el pago.
            </p>
            <Link
              href={`/reserva/${payment.appointment.code}`}
              className={buttonClasses({ variant: "outline", className: "mt-5 w-full" })}
            >
              Volver a mi reserva
            </Link>
          </div>
        ) : checkout ? (
          <NeonetRedirect action={checkout.action} fields={checkout.fields} />
        ) : null}
      </div>

      <p className="mt-5 text-[10px] leading-relaxed text-stone-600">
        Serás redirigido al sitio seguro de NeoNet. Navaja no recibe ni almacena los datos de tu
        tarjeta. La reserva se confirma cuando NeoNet notifica el pago aprobado a nuestro servidor.
      </p>
    </div>
  );
}
