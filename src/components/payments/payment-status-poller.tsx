"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui";

type Status = {
  status: string;
  appointmentStatus: string;
  code: string;
  amountCents: number;
  paidAt: string | null;
};

export function PaymentStatusPoller({ externalId }: { externalId: string }) {
  const [data, setData] = useState<Status | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(
          `/api/payments/status?externalId=${encodeURIComponent(externalId)}`,
          { cache: "no-store" },
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar el pago");
        if (cancelled) return;
        setData(payload);
        setAttempts((value) => value + 1);
        if (payload.status !== "PAID" && payload.status !== "FAILED" && attempts < 20) {
          timer = setTimeout(poll, 2500);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error de conexión");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-6 text-center">
        <XCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-3 text-sm text-red-200">{error}</p>
        <Link
          href="/reservar"
          className={buttonClasses({ variant: "outline", className: "mt-5" })}
        >
          Volver a reservar
        </Link>
      </div>
    );
  }

  if (!data || (data.status !== "PAID" && data.status !== "FAILED")) {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-850 p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold-400" />
        <p className="mt-4 font-display text-xl text-stone-100">Verificando tu pago…</p>
        <p className="mt-2 text-xs leading-relaxed text-stone-500">
          Estamos esperando la confirmación de la pasarela. Esto puede tomar unos segundos. No
          cerramos tu reserva hasta recibir la verificación del servidor.
        </p>
        {attempts >= 20 ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-amber-300">
            <RefreshCw className="h-3.5 w-3.5" />
            El pago sigue pendiente. Revisa tu reserva en unos minutos.
          </p>
        ) : null}
      </div>
    );
  }

  if (data.status === "PAID") {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <p className="mt-4 font-display text-2xl text-stone-50">¡Pago confirmado!</p>
        <p className="mt-2 text-sm text-stone-400">
          Tu cita quedó confirmada. Te enviamos el comprobante por correo.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={`/reserva/${data.code}`} className={buttonClasses({ variant: "gold" })}>
            Ver mi reserva
          </Link>
          <Link
            href={`/reserva/${data.code}/comprobante`}
            className={buttonClasses({ variant: "outline" })}
          >
            Ver comprobante
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-8 text-center">
      <XCircle className="mx-auto h-10 w-10 text-red-400" />
      <p className="mt-4 font-display text-2xl text-stone-50">El pago no se completó</p>
      <p className="mt-2 text-sm text-stone-400">
        Tu horario sigue reservado temporalmente. Puedes intentar de nuevo.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={`/reserva/${data.code}`} className={buttonClasses({ variant: "gold" })}>
          Reintentar pago
        </Link>
        <Link href="/reservar" className={buttonClasses({ variant: "outline" })}>
          Elegir otro horario
        </Link>
      </div>
    </div>
  );
}
