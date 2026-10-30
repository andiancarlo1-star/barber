"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, CreditCard, Loader2, XCircle } from "lucide-react";
import { Alert, Button } from "@/components/ui";

export function PayNowButton({ code, label }: { code: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo iniciar el pago");
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={pay} disabled={loading} className="w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {loading ? "Conectando…" : label}
      </Button>
      {error ? <Alert tone="error" className="mt-3">{error}</Alert> : null}
    </div>
  );
}

export function CancelAppointmentButton({ code }: { code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function cancel() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, reason: "Cancelada por el cliente" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cancelar la cita");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs text-stone-500 underline decoration-stone-700 underline-offset-4 transition hover:text-red-300"
        >
          Cancelar mi cita
        </button>
        {error ? <p className="mt-2 text-[11px] text-red-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-red-200">
        <XCircle className="h-4 w-4" />
        ¿Confirmas la cancelación?
      </p>
      <p className="mt-1 text-[11px] text-stone-400">
        Esta acción libera tu horario. Si ya pagaste un anticipo, contáctanos para gestionar el
        reembolso según la política.
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="danger" size="sm" onClick={cancel} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Sí, cancelar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Mantener cita
        </Button>
      </div>
      {error ? <p className="mt-2 text-[11px] text-red-400">{error}</p> : null}
    </div>
  );
}

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-stone-300 transition hover:border-gold-500/30 hover:text-gold-200"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar código"}
    </button>
  );
}
