"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  CalendarRange,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  ShieldCheck,
  Sparkles,
  Clock,
  Users,
  X,
} from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  {
    section: "Principal",
    items: [
      { href: "/admin", label: "Panel", icon: LayoutDashboard },
      { href: "/admin/citas", label: "Citas", icon: CalendarDays },
      { href: "/admin/calendario", label: "Calendario", icon: CalendarRange },
    ],
  },
  {
    section: "Gestión",
    items: [
      { href: "/admin/clientes", label: "Clientes", icon: Users },
      { href: "/admin/barberos", label: "Barberos", icon: Scissors },
      { href: "/admin/servicios", label: "Servicios", icon: Sparkles },
      { href: "/admin/horarios", label: "Horarios", icon: Clock },
    ],
  },
  {
    section: "Sistema",
    items: [
      { href: "/admin/pagos", label: "Pagos", icon: CreditCard },
      { href: "/admin/configuracion", label: "Configuración", icon: Settings },
      { href: "/admin/auditoria", label: "Auditoría", icon: ShieldCheck },
    ],
  },
];

const BARBER_NAV = [
  {
    section: "Mi trabajo",
    items: [
      { href: "/barbero", label: "Resumen", icon: LayoutDashboard },
      { href: "/barbero/agenda", label: "Mi agenda", icon: CalendarDays },
      { href: "/barbero/disponibilidad", label: "Mi disponibilidad", icon: Clock },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/admin": "Panel general",
  "/admin/citas": "Citas",
  "/admin/citas/nueva": "Nueva cita",
  "/admin/calendario": "Calendario",
  "/admin/clientes": "Clientes",
  "/admin/barberos": "Barberos",
  "/admin/servicios": "Servicios",
  "/admin/horarios": "Horarios y bloqueos",
  "/admin/pagos": "Pagos",
  "/admin/configuracion": "Configuración",
  "/admin/auditoria": "Auditoría",
  "/barbero": "Mi resumen",
  "/barbero/agenda": "Mi agenda",
  "/barbero/disponibilidad": "Mi disponibilidad",
};

export function StaffShell({
  variant,
  user,
  todayLabel,
  children,
}: {
  variant: "admin" | "barber";
  user: { name: string; email: string; role: string };
  todayLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nav = variant === "admin" ? ADMIN_NAV : BARBER_NAV;
  const home = variant === "admin" ? "/admin" : "/barbero";
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/admin/clientes")
      ? "Cliente"
      : pathname.startsWith("/admin/barberos")
        ? "Barbero"
        : pathname.startsWith("/admin/servicios")
          ? "Servicio"
          : pathname.startsWith("/admin/citas")
            ? "Cita"
            : variant === "admin"
              ? "Panel"
              : "Mi agenda");

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900">
      <div className="flex h-16 items-center border-b border-white/5 px-5">
        <Link href={home} onClick={() => setOpen(false)}>
          <BrandLockup />
        </Link>
      </div>
      <div className="border-b border-white/5 px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold-500">
          {variant === "admin" ? "Administración" : "Barberos"}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {nav.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-600">
              {group.section}
            </p>
            {group.items.map((item) => {
              const active =
                item.href === home ? pathname === home : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition",
                    active
                      ? "bg-gold-500/10 font-medium text-gold-200"
                      : "text-stone-400 hover:bg-white/5 hover:text-stone-100",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-gold-400" : "text-stone-500")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-gradient text-xs font-bold text-ink-950">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-stone-200">{user.name}</p>
            <p className="truncate text-[10px] text-stone-600">{user.email}</p>
          </div>
        </div>
        <div className="mt-1 flex gap-1">
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] text-stone-500 hover:bg-white/5 hover:text-stone-300"
          >
            <ExternalLink className="h-3 w-3" />
            Ver sitio
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] text-stone-500 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-3 w-3" />
            Salir
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-white/5 lg:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-white/10 shadow-card">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white/5"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-ink-950/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-stone-300 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-stone-100">{title}</h1>
              <p className="hidden text-[10px] text-stone-600 sm:block">{todayLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/reservar"
              className="hidden rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-stone-400 hover:border-gold-500/30 hover:text-gold-200 sm:block"
            >
              Nueva reserva
            </Link>
            <span className="rounded-full border border-gold-500/25 bg-gold-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-gold-300">
              {user.role === "ADMIN" ? "Admin" : "Barbero"}
            </span>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
