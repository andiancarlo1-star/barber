"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";
import { Alert, Button } from "@/components/ui";

export function MockPaymentPanel({
  paymentId,
  code,
  amountLabel,
}: {
  paymentId: string;
  code: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "DECLINED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(outcome: "APPROVED" | "DECLINED") {
    setLoading(outcome);
    setError(null);
    try {
      const response = await fetch("/api/payments/mock/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, outcome }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo procesar la simulación");

      if (outcome === "APPROVED") {
        router.push(`/reserva/${code}?pago=ok`);
      } else {
        router.push(`/reserva/${code}?pago=error`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-200">
          <AlertCircle className="h-4 w-4" />
          Entorno de demostración
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">
          Esta pantalla simula la pasarela de pagos. No ingreses datos reales de tarjeta y no se
          realizará ningún cobro. En producción serás redirigido a NeoNet.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-ink-900 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Monto a pagar</p>
            <p className="mt-1 font-display text-3xl text-stone-50">{amountLabel}</p>
          </div>
          <div className="flex h-11 w-16 items-center justify-center rounded-lg border border-white/10 bg-ink-800">
            <CreditCard className="h-6 w-6 text-gold-400" />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-ink-950 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600">Tarjeta de prueba</p>
          <p className="mt-2 font-mono text-sm tracking-[0.14em] text-stone-300">
            4242 4242 4242 4242
          </p>
          <div className="mt-2 flex gap-6 font-mono text-[11px] text-stone-500">
            <span>12 / 30</span>
            <span>CVV •••</span>
            <span className="text-gold-400">VISA</span>
          </div>
        </div>

        {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={() => pay("APPROVED")} disabled={loading !== null}>
            {loading === "APPROVED" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Simular pago aprobado
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => pay("DECLINED")}
            disabled={loading !== null}
          >
            {loading === "DECLINED" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Simular rechazo
          </Button>
        </div>
      </div>

      <p className="text-center text-[10px] text-stone-600">
        La confirmación se procesa en el servidor y actualiza la reserva mediante el mismo flujo que
        un webhook real.
      </p>
    </div>
  );
}
