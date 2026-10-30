"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Scissors,
  X,
} from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#servicios", label: "Servicios" },
  { href: "/#barberos", label: "Barberos" },
  { href: "/#galeria", label: "Galería" },
  { href: "/#horarios", label: "Horarios" },
  { href: "/#contacto", label: "Contacto" },
];

export function SiteHeader({
  businessName,
  user,
}: {
  businessName: string;
  user: { name: string; role: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  const panelHref = user?.role === "ADMIN" ? "/admin" : user?.role === "BARBER" ? "/barbero" : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300",
        scrolled
          ? "border-white/10 bg-ink-950/90 backdrop-blur-xl"
          : "border-transparent bg-gradient-to-b from-ink-950/80 to-transparent",
      )}
    >
      <div className="container-px flex h-20 items-center justify-between">
        <Link href="/" aria-label={businessName}>
          <BrandLockup name="Navaja" sub="Barber Studio" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium tracking-wide text-stone-300 transition hover:text-gold-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-xs text-stone-300 transition hover:border-gold-500/30 hover:text-stone-100"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-gradient text-[11px] font-bold text-ink-950">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-24 truncate">{user.name.split(" ")[0]}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-stone-500 transition ${accountOpen ? "rotate-180" : ""}`}
                />
              </button>
              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-ink-850 p-1.5 shadow-card"
                >
                  <p className="truncate px-3 py-2 text-[10px] text-stone-600">{user.name}</p>
                  {panelHref ? (
                    <Link
                      href={panelHref}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-stone-300 hover:bg-white/5 hover:text-gold-200"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      {user.role === "ADMIN" ? "Dashboard" : "Mi agenda"}
                    </Link>
                  ) : (
                    <Link
                      href="/mis-citas"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-stone-300 hover:bg-white/5 hover:text-gold-200"
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      Mis citas
                    </Link>
                  )}
                  <Link
                    href="/reservar"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-stone-300 hover:bg-white/5 hover:text-gold-200"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Reservar cita
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-stone-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link href="/ingresar" className={buttonClasses({ variant: "ghost", size: "sm" })}>
              <LogIn className="h-4 w-4" />
              Ingresar
            </Link>
          )}
          <Link href="/reservar" className={buttonClasses({ variant: "gold", size: "sm" })}>
            <CalendarDays className="h-4 w-4" />
            Reservar cita
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-stone-200 lg:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-ink-950/98 px-5 pb-8 pt-4 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 border-b border-white/5 py-3.5 text-sm text-stone-300"
              >
                <Scissors className="h-3.5 w-3.5 text-gold-500" />
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                {panelHref ? (
                  <Link href={panelHref} className="border-b border-white/5 py-3.5 text-sm text-gold-300">
                    {user.role === "ADMIN" ? "Dashboard administrativo" : "Mi agenda"}
                  </Link>
                ) : (
                  <Link href="/mis-citas" className="border-b border-white/5 py-3.5 text-sm text-gold-300">
                    Mis citas
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-3 border-b border-white/5 py-3.5 text-left text-sm text-stone-400"
                >
                  <LogOut className="h-3.5 w-3.5 text-red-400" />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link href="/ingresar" className="border-b border-white/5 py-3.5 text-sm text-stone-300">
                Ingresar
              </Link>
            )}
          </nav>
          <Link
            href="/reservar"
            className={buttonClasses({ variant: "gold", size: "lg", className: "mt-6 w-full" })}
          >
            <CalendarDays className="h-4 w-4" />
            Reservar cita
          </Link>
        </div>
      ) : null}
    </header>
  );
}
