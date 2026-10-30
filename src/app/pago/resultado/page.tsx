import Link from "next/link";
import { Clock3 } from "lucide-react";
import { PaymentStatusPoller } from "@/components/payments/payment-status-poller";
import { buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <div className="container-px mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <p className="eyebrow">Resultado del pago</p>
        <h1 className="mt-2 text-3xl">Estamos confirmando tu cita</h1>
        <p className="mt-2 text-xs text-stone-500">
          No cierres esta página hasta que veas la confirmación.
        </p>
      </div>

      {ref ? (
        <PaymentStatusPoller externalId={ref} />
      ) : (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-8 text-center">
          <Clock3 className="mx-auto h-8 w-8 text-amber-400" />
          <p className="mt-3 text-sm text-amber-200">No encontramos la referencia del pago.</p>
          <Link href="/reservar" className={buttonClasses({ variant: "outline", className: "mt-5" })}>
            Volver a reservar
          </Link>
        </div>
      )}
    </div>
  );
}
