import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand";

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-ink-950">
      <div className="absolute inset-x-0 top-0 h-80 bg-radial-gold" />
      <header className="relative border-b border-white/5">
        <div className="container-px flex h-20 items-center justify-between">
          <Link href="/">
            <BrandLockup />
          </Link>
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-stone-500">
            <Lock className="h-3.5 w-3.5 text-gold-500" />
            Pago seguro
          </span>
        </div>
      </header>
      <main className="relative flex-1 py-10 sm:py-14">{children}</main>
      <footer className="relative border-t border-white/5 py-6">
        <div className="container-px flex flex-col items-center justify-between gap-2 text-[10px] text-stone-600 sm:flex-row">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Nunca almacenamos el número completo de tu tarjeta ni el CVV.
          </p>
          <p>Navaja Barber Studio · Guatemala</p>
        </div>
      </footer>
    </div>
  );
}
