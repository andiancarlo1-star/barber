import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Quote } from "lucide-react";
import { BrandLockup } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1400&q=85"
          alt="Interior de Navaja Barber Studio"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/30" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/">
            <BrandLockup />
          </Link>
          <div className="max-w-md">
            <Quote className="h-8 w-8 text-gold-500/60" />
            <p className="mt-4 font-display text-3xl leading-snug text-stone-100">
              “Un buen corte no se mide en minutos, se mide en cómo te hace sentir al salir.”
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-gold-400">
              Carlos Méndez · Master Barber
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-stone-600">
            Zona 14 · Ciudad de Guatemala
          </p>
        </div>
      </div>

      <div className="relative flex flex-col bg-ink-950">
        <div className="absolute inset-x-0 top-0 h-64 bg-radial-gold lg:hidden" />
        <div className="relative flex flex-1 flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-[11px] text-stone-500 transition hover:text-gold-300 lg:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al sitio
            </Link>
            {children}
          </div>
        </div>
        <div className="relative border-t border-white/5 px-5 py-4 text-center text-[10px] text-stone-600 sm:px-10">
          © {new Date().getFullYear()} Navaja Barber Studio · Hecho en Guatemala
        </div>
      </div>
    </div>
  );
}
